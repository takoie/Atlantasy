<script lang="ts">
  import {
    Newspaper,
    Plus,
    Heart,
    Image,
    X,
    Trash2,
    Send,
    ArrowLeft,
  } from "lucide-svelte";

  let {
    articles = [],
    currentUser = null,
    onBack = () => {},
    onCreateArticle = async (_data: any): Promise<any> => {},
    onLikeArticle = (_articleId: string) => {},
    onDeleteArticle = (_articleId: string) => {},
  }: {
    articles?: any[];
    currentUser?: any;
    onBack?: () => void;
    onCreateArticle?: (data: any) => Promise<any> | any;
    onLikeArticle?: (articleId: string) => void;
    onDeleteArticle?: (articleId: string) => void;
  } = $props();

  let isCreateModalOpen = $state(false);
  let selectedArticle = $state<any>(null);

  // Ny artikkel state
  let articleTitle = $state("");
  let articleContent = $state("");
  let articleTag = $state("Runderapport");
  let articleImageUrl = $state("");
  let isSubmitting = $state(false);
  let isDraggingImage = $state(false);

  function handleImagePaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            articleImageUrl = event.target?.result as string;
          };
          reader.readAsDataURL(blob);
          e.preventDefault();
          break;
        }
      }
    }
  }

  function handleImageFileSelect(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        articleImageUrl = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  function handleImageDrop(e: DragEvent) {
    e.preventDefault();
    isDraggingImage = false;
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        articleImageUrl = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmitArticle() {
    if (!articleTitle.trim() || !articleContent.trim()) {
      alert("Vennligst fyll ut både tittel og innhold.");
      return;
    }

    isSubmitting = true;
    try {
      await onCreateArticle({
        title: articleTitle.trim(),
        content: articleContent.trim(),
        tag: articleTag,
        imageUrl: articleImageUrl || undefined,
        authorName: currentUser?.username || "Admin",
        authorAvatar: currentUser?.avatar,
      });

      // Nullstill
      articleTitle = "";
      articleContent = "";
      articleImageUrl = "";
      isCreateModalOpen = false;
    } catch (err: any) {
      alert(err.message || "Kunne ikke opprette artikkel.");
    } finally {
      isSubmitting = false;
    }
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString("no-NO", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<div class="flex-1 flex flex-col h-full overflow-hidden space-y-3">
  <!-- Header Bar -->
  <div class="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/20">
        <Newspaper class="w-5 h-5" />
      </div>
      <div>
        <h2 class="text-base font-bold text-white flex items-center gap-2">
          <span>Atlantasy nyheter og avisen</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/60 font-mono">
            {articles.length} artikler
          </span>
        </h2>
        <p class="text-xs text-slate-400">Runderapporter, taktiske analyser, overganger og ligabanter</p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button
        onclick={() => (isCreateModalOpen = true)}
        class="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
      >
        <Plus class="w-4 h-4" />
        <span>Skriv ny artikkel</span>
      </button>

      <button
        onclick={onBack}
        class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1.5"
      >
        <ArrowLeft class="w-3.5 h-3.5" />
        <span>Tilbake</span>
      </button>
    </div>
  </div>

  <!-- Artikkelliste / Avis Rutenett -->
  <div class="flex-1 overflow-y-auto pr-1">
    {#if articles.length === 0}
      <div class="h-64 flex flex-col items-center justify-center text-center p-8 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
        <Newspaper class="w-10 h-10 text-slate-600" />
        <div>
          <h3 class="text-sm font-bold text-slate-300">Ingen artikler publisert enda</h3>
          <p class="text-xs text-slate-500 mt-1">Bli den første til å publisere en runderapport eller artikkel!</p>
        </div>
        <button
          onclick={() => (isCreateModalOpen = true)}
          class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
        >
          Skriv artikkel nå
        </button>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each articles as article (article._id)}
          <div
            role="button"
            tabindex="0"
            onclick={() => (selectedArticle = article)}
            onkeydown={(e) => (e.key === "Enter" || e.key === " ") && (selectedArticle = article)}
            class="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:shadow-xl cursor-pointer group"
          >
            <!-- Artikkel Bilde (hvis finnes) -->
            {#if article.imageUrl}
              <div class="h-44 w-full overflow-hidden bg-slate-950 relative">
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span class="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md text-[10px] font-bold text-fpl-cyan border border-fpl-cyan/40 uppercase">
                  {article.tag || "Nyhet"}
                </span>
              </div>
            {/if}

            <!-- Artikkel Innhold -->
            <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div class="space-y-1.5">
                {#if !article.imageUrl}
                  <span class="inline-block px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-fpl-cyan border border-slate-700 uppercase">
                    {article.tag || "Nyhet"}
                  </span>
                {/if}

                <h3 class="text-sm font-bold text-white group-hover:text-fpl-cyan transition-colors line-clamp-2">
                  {article.title}
                </h3>

                <p class="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {article.content}
                </p>
              </div>

              <!-- Forfatter og Dato Footer -->
              <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <div class="flex items-center gap-1.5 truncate">
                  <img
                    src={article.authorAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${article.authorName}`}
                    alt="Avatar"
                    class="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 shrink-0"
                  />
                  <span class="text-slate-300 font-medium truncate">{article.authorName}</span>
                </div>

                <div class="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onclick={(e) => {
                      e.stopPropagation();
                      onLikeArticle(article._id);
                    }}
                    class="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <Heart class="w-3.5 h-3.5 fill-rose-500/20 text-rose-400" />
                    <span>{article.likes}</span>
                  </button>

                  <span>{formatDate(article.createdAt)}</span>

                  {#if currentUser?.role === "admin"}
                    <button
                      type="button"
                      title="Slett artikkel"
                      onclick={(e) => {
                        e.stopPropagation();
                        if (confirm("Vil du slette denne artikkelen?")) onDeleteArticle(article._id);
                      }}
                      class="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Modal: Skriv Ny Artikkel -->
{#if isCreateModalOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
    <div
      class="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
    >
      <!-- Header -->
      <div class="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="p-2 rounded-lg bg-fpl-cyan/20 text-fpl-cyan">
            <Newspaper class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">Opprett Ny Artikkel / Runderapport</h3>
            <p class="text-xs text-slate-400">Del analyse, reaksjoner eller nyheter med hele ligaen</p>
          </div>
        </div>
        <button
          onclick={() => (isCreateModalOpen = false)}
          class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Skjema -->
      <div class="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
        <!-- Tittel & Kategori -->
        <div class="grid grid-cols-3 gap-3">
          <div class="col-span-2">
            <label for="news-title" class="block font-semibold text-slate-300 mb-1">Overskrift *</label>
            <input
              id="news-title"
              type="text"
              bind:value={articleTitle}
              placeholder="f.eks. Rom A1 dominerer Gameweek 26 med Haaland-trippel!"
              class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-fpl-cyan focus:outline-none"
            />
          </div>

          <div>
            <label for="news-tag" class="block font-semibold text-slate-300 mb-1">Kategori</label>
            <select
              id="news-tag"
              bind:value={articleTag}
              class="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="Runderapport">Runderapport</option>
              <option value="Taktikk">Taktikk og byttediskusjon</option>
              <option value="Banter">Banter og rivalisering</option>
              <option value="Nyhet">Offisiell nyhet</option>
            </select>
          </div>
        </div>

        <!-- Innhold (med Clipboard Paste lytter) -->
        <div>
          <label for="news-content" class="block font-semibold text-slate-300 mb-1">
            Artikkelinnhold *
          </label>
          <textarea
            id="news-content"
            rows="6"
            bind:value={articleContent}
            onpaste={handleImagePaste}
            placeholder="Skriv artikkelen her... (Tips: Du kan trykke Ctrl+V for å lime inn bilder direkte fra utklippstavlen!)"
            class="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white leading-relaxed focus:border-emerald-500 focus:outline-none"
          ></textarea>
        </div>

        <!-- Bildeopplasting / Clipboard Paste Sone -->
        <div>
          <label class="block font-semibold text-slate-300 mb-1 flex items-center justify-between">
            <span>Artikkelbilde (valgfritt)</span>
            <span class="text-[10px] text-emerald-400">Støtter Ctrl+V / lim inn fra utklippstavlen</span>
          </label>

          {#if articleImageUrl}
            <div class="relative rounded-xl overflow-hidden border border-slate-700 max-h-48 bg-slate-950 group">
              <img src={articleImageUrl} alt="Preview" class="w-full h-48 object-cover" />
              <button
                type="button"
                onclick={() => (articleImageUrl = "")}
                class="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/80 hover:bg-rose-600 text-white transition-colors"
                title="Fjern bilde"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          {:else}
            <div
              role="region"
              aria-label="Dra og slipp bildeområde"
              ondragover={(e) => {
                e.preventDefault();
                isDraggingImage = true;
              }}
              ondragleave={() => (isDraggingImage = false)}
              ondrop={handleImageDrop}
              class={`border-2 border-dashed rounded-xl p-4 text-center transition-colors flex flex-col items-center justify-center space-y-2 cursor-pointer ${
                isDraggingImage ? "border-emerald-500 bg-emerald-500/10" : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
              }`}
            >
              <Image class="w-8 h-8 text-slate-500" />
              <div class="text-[11px] text-slate-400">
                <span>Dra og slipp et bilde her, eller </span>
                <label class="text-emerald-400 hover:underline cursor-pointer font-semibold">
                  velg en fil
                  <input type="file" accept="image/*" onchange={handleImageFileSelect} class="hidden" />
                </label>
              </div>
              <p class="text-[10px] text-slate-500">Du kan også bare trykke <kbd class="px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">Ctrl + V</kbd> hvor som helst for å lime inn bilde</p>
            </div>
          {/if}
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
        <button
          onclick={() => (isCreateModalOpen = false)}
          class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
        >
          Avbryt
        </button>
        <button
          onclick={handleSubmitArticle}
          disabled={isSubmitting || !articleTitle.trim() || !articleContent.trim()}
          class="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-all shadow-sm flex items-center gap-1.5"
        >
          <Send class="w-3.5 h-3.5" />
          <span>{isSubmitting ? "Publiserer..." : "Publiser artikkel"}</span>
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal: Les Hele Artikkelen -->
{#if selectedArticle}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
    <div
      class="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
    >
      <!-- Header -->
      <div class="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <span class="px-2.5 py-0.5 rounded-md bg-purple-950 text-purple-300 border border-purple-800/60 font-bold text-xs uppercase">
          {selectedArticle.tag || "Nyhet"}
        </span>
        <button
          onclick={() => (selectedArticle = null)}
          class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Innhold -->
      <div class="p-6 overflow-y-auto space-y-4 flex-1">
        <h1 class="text-xl font-black text-white leading-snug">
          {selectedArticle.title}
        </h1>

        <div class="flex items-center justify-between pb-3 border-b border-slate-800 text-xs text-slate-400">
          <div class="flex items-center gap-2">
            <img
              src={selectedArticle.authorAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedArticle.authorName}`}
              alt="Avatar"
              class="w-6 h-6 rounded-full bg-slate-800 border border-slate-700"
            />
            <span class="text-slate-200 font-semibold">{selectedArticle.authorName}</span>
          </div>
          <span>{formatDate(selectedArticle.createdAt)}</span>
        </div>

        {#if selectedArticle.imageUrl}
          <div class="rounded-xl overflow-hidden border border-slate-800 max-h-80 bg-slate-950">
            <img src={selectedArticle.imageUrl} alt={selectedArticle.title} class="w-full h-full object-contain" />
          </div>
        {/if}

        <div class="text-sm text-slate-200 leading-relaxed whitespace-pre-line pt-2">
          {selectedArticle.content}
        </div>
      </div>

      <!-- Footer med like knapp -->
      <div class="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
        <button
          onclick={() => onLikeArticle(selectedArticle._id)}
          class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold text-xs flex items-center gap-2 transition-colors"
        >
          <Heart class="w-4 h-4 fill-rose-500/30" />
          <span>Lik denne artikkelen ({selectedArticle.likes})</span>
        </button>

        <button
          onclick={() => (selectedArticle = null)}
          class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
        >
          Lukk
        </button>
      </div>
    </div>
  </div>
{/if}
