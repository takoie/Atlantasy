use std::io::Write;
use tauri::Emitter;

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

    // Start installasjonsprogrammet
    std::process::Command::new(&setup_path)
        .spawn()
        .map_err(|e| format!("Kunne ikke starte installasjonsprogrammet: {}", e))?;

    // Lukk Atlantasy så filene kan oppdateres
    std::process::exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![greet, download_and_launch_installer])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
