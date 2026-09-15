use std::io::Write;
use tauri::{Emitter, Manager};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hei, {}! Velkommen til Atlantasy.", name)
}

#[tauri::command]
async fn download_and_launch_installer(
    app: tauri::AppHandle,
    url: String,
) -> Result<(), String> {
    let temp_dir = std::env::temp_dir();
    let setup_path = temp_dir.join("Atlantasy-Setup-Update.exe");

    let client = reqwest::Client::builder()
        .user_agent("Atlantasy-Desktop")
        .build()
        .map_err(|e| format!("Kunne ikke initialisere nettverk: {}", e))?;

    let mut response = client.get(&url)
        .send()
        .await
        .map_err(|e| format!("Kunne ikke koble til nedlastingsserver: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Nedlasting feilet med statuskode: {}", response.status()));
    }

    let total_size = response.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;

    let mut file = std::fs::File::create(&setup_path)
        .map_err(|e| format!("Kunne ikke opprette midlertidig installasjonsfil: {}", e))?;

    while let Some(chunk) = response.chunk().await.map_err(|e| format!("Feil under datanedlasting: {}", e))? {
        file.write_all(&chunk).map_err(|e| format!("Kunne ikke skrive til disk: {}", e))?;
        downloaded += chunk.len() as u64;
        let _ = app.emit("update-progress", serde_json::json!({
            "downloaded": downloaded,
            "total": total_size
        }));
    }

    file.flush().map_err(|e| format!("Kunne ikke fullføre filskriving: {}", e))?;
    drop(file);

    // Start installasjonsprogrammet med UAC-elevasjonsstøtte (ShellExecute)
    #[cfg(target_os = "windows")]
    {
        let status = std::process::Command::new("cmd")
            .args(["/c", "start", "", &setup_path.to_string_lossy()])
            .spawn();

        if let Err(cmd_err) = status {
            std::process::Command::new("powershell")
                .args([
                    "-NoProfile",
                    "-WindowStyle",
                    "Hidden",
                    "-Command",
                    &format!("Start-Process -FilePath \"{}\"", setup_path.display()),
                ])
                .spawn()
                .map_err(|e| format!("Kunne ikke starte installasjonsprogrammet: {} ({})", e, cmd_err))?;
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new(&setup_path)
            .spawn()
            .map_err(|e| format!("Kunne ikke starte installasjonsprogrammet: {}", e))?;
    }

    // Gi Windows Shell litt tid til å registrere prosessen og åpne UAC før Atlantasy lukkes
    std::thread::sleep(std::time::Duration::from_millis(600));
    std::process::exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = window.current_monitor() {
                    let scale_factor = monitor.scale_factor();
                    let physical_size = monitor.size();
                    let logical_width = physical_size.width as f64 / scale_factor;
                    let logical_height = physical_size.height as f64 / scale_factor;

                    // Beregn optimal vindusstørrelse tilpasset skjermoppløsning og Windows-oppgavelinje
                    // For f.eks. 1920x1080 med 125% DPI (1536x864 logisk) eller 100% DPI (1920x1080)
                    let target_width = (logical_width * 0.86).clamp(980.0, 1440.0);
                    let target_height = (logical_height * 0.84).clamp(580.0, 860.0);

                    let _ = window.set_size(tauri::LogicalSize::new(target_width, target_height));
                    let _ = window.center();
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet, download_and_launch_installer])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
