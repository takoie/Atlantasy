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
    Heading2,
    Bold,
    Italic,
    Quote,
    List,
    Eye,
    Edit3,
    Upload,
    Sparkles,
    Pin,
    Archive,
    ArchiveRestore,
    Check,
    AlertTriangle,
  } from "lucide-svelte";

  let {
    articles = [],
    currentUser = null,
    onBack = () => {},
    onCreateArticle = async (_data: any): Promise<any> => {},
    onUpdateArticle = async (_data: any): Promise<any> => {},
    onLikeArticle = (_articleId: string) => {},
    onDeleteArticle = (_articleId: string) => {},
    onToggleArchive = (_articleId: string) => {},
    onTogglePin = (_articleId: string) => {},
  }: {
    articles?: any[];
    currentUser?: any;
    onBack?: () => void;
    onCreateArticle?: (data: any) => Promise<any> | any;
    onUpdateArticle?: (data: any) => Promise<any> | any;
    onLikeArticle?: (articleId: string) => void;
    onDeleteArticle?: (articleId: string) => void;
    onToggleArchive?: (articleId: string) => void;
    onTogglePin?: (articleId: string) => void;
  } = $props();

  let isCreateModalOpen = $state(false);
  let editingArticleId = $state<string | null>(null);
  let selectedArticle = $state<any>(null);
  let editorTab = $state<"write" | "preview">("write");
  let activeFilterTab = $state<"active" | "archived" | "all">("active");

  // Skjema state
  let articleTitle = $state("");
  let articleLead = $state("");
  let articleContent = $state("");
  let articleTag = $state("Runderapport");
  let articleCoverUrl = $state("");
  let isSubmitting = $state(false);

  // Inline bilde-dialog state
  let isImageModalOpen = $state(false);
  let inlineImageUrl = $state("");
  let inlineImageCaption = $state("");
  let textareaRef: HTMLTextAreaElement | null = $state(null);

  // Filterte artikler basert på tab
  let displayedArticles = $derived(
    articles.filter((a) => {
      if (activeFilterTab === "active") return !a.isArchived;
      if (activeFilterTab === "archived") return a.isArchived;
      return true;
    })
  );

  let activeCount = $derived(articles.filter((a) => !a.isArchived).length);
  let archivedCount = $derived(articles.filter((a) => a.isArchived).length);

  function openCreateModal() {
    editingArticleId = null;
    articleTitle = "";
    articleLead = "";
    articleContent = "";
    articleCoverUrl = "";
    articleTag = "Runderapport";
    editorTab = "write";
    isCreateModalOpen = true;
  }

  function openEditModal(article: any, e?: MouseEvent) {
    if (e) e.stopPropagation();
    editingArticleId = article._id;
    articleTitle = article.title || "";
    articleLead = article.lead || "";
    articleContent = article.content || "";
    articleCoverUrl = article.imageUrl || "";
    articleTag = article.tag || "Runderapport";
    editorTab = "write";
    isCreateModalOpen = true;
    if (selectedArticle?._id === article._id) {
      selectedArticle = null;
    }
  }

  function handleCoverFileSelect(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        articleCoverUrl = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  function handleInlineFileSelect(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        inlineImageUrl = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  function handleInlinePaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            inlineImageUrl = event.target?.result as string;
          };
          reader.readAsDataURL(blob);
          e.preventDefault();
          break;
        }
      }
    }
  }

  function insertInlineImage() {
    if (!inlineImageUrl) {
      alert("Vennligst velg eller lim inn et bilde først.");
      return;
    }

    const caption = inlineImageCaption.trim() ? inlineImageCaption.trim() : "Bilde";
    const markdown = `\n\n![${caption}](${inlineImageUrl})\n\n`;

    insertAtCursor(markdown);

    inlineImageUrl = "";
    inlineImageCaption = "";
    isImageModalOpen = false;
  }

  function insertAtCursor(text: string) {
    if (!textareaRef) {
      articleContent += text;
      return;
    }

    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const before = articleContent.substring(0, start);
    const after = articleContent.substring(end);

    articleContent = before + text + after;
  }

  function insertFormat(type: "h2" | "bold" | "italic" | "quote" | "list") {
    switch (type) {
      case "h2":
        insertAtCursor("\n\n## Underoverskrift\n\n");
        break;
      case "bold":
        insertAtCursor(" **fet tekst** ");
        break;
      case "italic":
        insertAtCursor(" *kursiv tekst* ");
        break;
      case "quote":
        insertAtCursor('\n\n> "Dette er et viktig sitat fra runden..."\n\n');
        break;
      case "list":
        insertAtCursor("\n\n- Punkt 1\n- Punkt 2\n- Punkt 3\n\n");
        break;
    }
  }

  async function handleSaveArticle() {
    if (!articleTitle.trim() || !articleContent.trim()) {
      alert("Vennligst fyll ut både tittel og hovedtekst.");
      return;
    }

    isSubmitting = true;
    try {
      if (editingArticleId) {
        // Oppdater eksisterende artikkel
        await onUpdateArticle({
          articleId: editingArticleId,
          title: articleTitle.trim(),
          lead: articleLead.trim() || undefined,
          content: articleContent.trim(),
          tag: articleTag,
          imageUrl: articleCoverUrl || undefined,
        });
      } else {
        // Opprett ny artikkel
        await onCreateArticle({
          title: articleTitle.trim(),
          lead: articleLead.trim() || undefined,
          content: articleContent.trim(),
          tag: articleTag,
          imageUrl: articleCoverUrl || undefined,
          authorName: currentUser?.username || "Admin",
          authorAvatar: currentUser?.avatar,
        });
      }

      editingArticleId = null;
      articleTitle = "";
      articleLead = "";
      articleContent = "";
      articleCoverUrl = "";
      articleTag = "Runderapport";
      isCreateModalOpen = false;
      editorTab = "write";
    } catch (err: any) {
      alert(err.message || "Kunne ikke lagre artikkel.");
    } finally {
      isSubmitting = false;
    }
  }

  function renderFormattedArticle(content: string) {
    if (!content) return [];

    const blocks: Array<{
      type: "paragraph" | "heading" | "quote" | "image" | "list";
      text?: string;
      src?: string;
      caption?: string;
      items?: string[];
    }> = [];

    const rawBlocks = content.split(/\n\n+/);

    for (const raw of rawBlocks) {
      const trimmed = raw.trim();
      if (!trimmed) continue;

      const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/s);
      if (imgMatch) {
        blocks.push({
          type: "image",
          caption: imgMatch[1],
          src: imgMatch[2],
        });
        continue;
      }

      if (trimmed.startsWith("## ")) {
        blocks.push({
          type: "heading",
          text: trimmed.replace(/^##\s+/, ""),
        });
        continue;
      }

      if (trimmed.startsWith("> ")) {
        blocks.push({
          type: "quote",
          text: trimmed.replace(/^>\s+/, "").replace(/^"(.*)"$/, "$1"),
        });
        continue;
      }

      if (trimmed.startsWith("- ")) {
        const items = trimmed
          .split("\n")
          .map((l) => l.replace(/^-\s+/, "").trim())
          .filter(Boolean);
        blocks.push({
          type: "list",
          items,
        });
        continue;
      }

      blocks.push({
        type: "paragraph",
        text: trimmed,
      });
    }

    return blocks;
  }
</script>

<div class="flex-1 flex flex-col h-full overflow-hidden space-y-3.5 text-[#E2E8F0] font-sans">
  <!-- Header Bar -->
  <div class="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[#384252] shrink-0">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-xl bg-[#9FE88D]/15 text-[#9FE88D] border border-[#9FE88D]/30">
        <Newspaper class="w-5 h-5" />
      </div>
      <div>
        <h2 class="text-base sm:text-lg font-bold text-white flex items-center gap-2">
          <span>Atlantasy Nyheter & Avisen</span>
          <span class="text-xs px-2.5 py-0.5 rounded-full bg-[#191E24] text-[#9FE88D] border border-[#384252] font-mono font-bold">
            {activeCount} aktive
          </span>
        </h2>
        <p class="text-xs text-[#94A3B8]">Runderapporter, analyser, overganger og redaksjonelle saker</p>
      </div>
    </div>

    <!-- Handlinger og Filter faner -->
    <div class="flex flex-wrap items-center gap-2">
      <!-- Arkiv / Aktiv Tabs -->
      <div class="flex items-center p-1 rounded-xl bg-[#191E24] border border-[#384252] text-xs font-bold">
        <button
          onclick={() => (activeFilterTab = "active")}
          class={`px-3 py-1.5 rounded-lg transition-colors ${
            activeFilterTab === "active"
              ? "bg-[#9FE88D] text-[#16380c] shadow-sm font-bold"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <span>Aktive ({activeCount})</span>
        </button>

        <button
          onclick={() => (activeFilterTab = "archived")}
          class={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
            activeFilterTab === "archived"
              ? "bg-[#F4C152] text-black shadow-sm font-bold"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <Archive class="w-3 h-3" />
          <span>Arkiv ({archivedCount})</span>
        </button>
      </div>

      <!-- Skriv ny artikkel knapp -->
      <button
        onclick={openCreateModal}
        class="px-4 py-2 rounded-xl bg-[#9FE88D] hover:bg-[#8ce078] text-[#16380c] text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center gap-1.5"
      >
        <Plus class="w-4 h-4" />
        <span>Skriv artikkel</span>
      </button>

      <button
        onclick={onBack}
        class="px-3.5 py-2 rounded-xl bg-[#242B35] hover:bg-[#2A303C] text-xs sm:text-sm font-semibold text-[#E2E8F0] border border-[#384252] transition-colors flex items-center gap-1.5"
      >
        <ArrowLeft class="w-4 h-4" />
        <span>Tilbake</span>
      </button>
    </div>
  </div>

  <!-- Artikkelliste / Avis Rutenett (DaisyUI Dim) -->
  <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar">
    {#if displayedArticles.length === 0}
      <div class="h-80 flex flex-col items-center justify-center text-center p-8 bg-[#2A303C] rounded-2xl border border-[#384252] space-y-3">
        <div class="w-14 h-14 rounded-2xl bg-[#191E24] border border-[#384252] flex items-center justify-center text-[#9FE88D]">
          <Newspaper class="w-7 h-7" />
        </div>
        <div>
          <h3 class="text-base font-bold text-white">
            {activeFilterTab === "archived" ? "Ingen arkiverte artikler" : "Ingen artikler publisert enda"}
          </h3>
          <p class="text-xs sm:text-sm text-[#94A3B8] mt-1 max-w-md">
            {activeFilterTab === "archived"
              ? "Artikler du arkiverer flyttes hit, og kan gjenopprettes når som helst."
              : "Skriv den første runderapporten med overskrift, ingress, avsnitt og bilder!"}
          </p>
        </div>
        {#if activeFilterTab !== "archived"}
          <button
            onclick={openCreateModal}
            class="px-4 py-2 rounded-xl bg-[#9FE88D] hover:bg-[#8ce078] text-[#16380c] text-xs sm:text-sm font-bold transition-colors"
          >
            Skriv artikkel nå
          </button>
        {/if}
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each displayedArticles as article (article._id)}
          <div
            role="button"
            tabindex="0"
            onclick={() => (selectedArticle = article)}
            onkeydown={(e) => (e.key === "Enter" || e.key === " ") && (selectedArticle = article)}
            class={`bg-[#2A303C] border rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-lg cursor-pointer group relative ${
              article.isPinned
                ? "border-[#F4C152]/60 hover:border-[#F4C152] shadow-md shadow-[#F4C152]/5"
                : article.isArchived
                ? "border-[#384252] opacity-75 hover:opacity-100"
                : "border-[#384252] hover:border-[#9FE88D]"
            }`}
          >
            <div>
              <!-- Coverbilde hvis tilstede -->
              {#if article.imageUrl}
                <div class="h-48 w-full overflow-hidden bg-[#191E24] relative">
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div class="absolute top-3 left-3 flex items-center gap-1.5">
                    <span class="px-2.5 py-1 rounded-lg bg-[#191E24]/90 text-xs font-bold text-[#9FE88D] border border-[#9FE88D]/40 uppercase shadow">
                      {article.tag || "Nyhet"}
                    </span>
                    {#if article.isPinned}
                      <span class="px-2 py-1 rounded-lg bg-[#F4C152] text-black text-xs font-bold flex items-center gap-1 shadow">
                        <Pin class="w-3 h-3 fill-black" />
                        <span>Festet</span>
                      </span>
                    {/if}
                    {#if article.isArchived}
                      <span class="px-2 py-1 rounded-lg bg-[#242B35] text-[#F4C152] text-xs font-bold border border-[#F4C152]/30 shadow">
                        Arkivert
                      </span>
                    {/if}
                  </div>
                </div>
              {/if}

              <div class="p-4 space-y-2.5">
                {#if !article.imageUrl}
                  <div class="flex items-center gap-2">
                    <span class="inline-block px-2.5 py-0.5 rounded-md bg-[#191E24] text-xs font-bold text-[#9FE88D] border border-[#384252] uppercase">
                      {article.tag || "Nyhet"}
                    </span>
                    {#if article.isPinned}
                      <span class="px-2 py-0.5 rounded-md bg-[#F4C152]/20 text-[#F4C152] border border-[#F4C152]/40 text-xs font-bold flex items-center gap-1">
                        <Pin class="w-3 h-3 fill-[#F4C152]" />
                        <span>Festet</span>
                      </span>
                    {/if}
                    {#if article.isArchived}
                      <span class="px-2 py-0.5 rounded-md bg-[#242B35] text-[#F4C152] text-xs font-bold border border-[#F4C152]/30">
                        Arkivert
                      </span>
                    {/if}
                  </div>
                {/if}

                <h3 class="text-base font-bold text-white group-hover:text-[#9FE88D] transition-colors line-clamp-2 leading-snug">
                  {article.title}
                </h3>

                {#if article.lead}
                  <p class="text-xs sm:text-sm font-semibold text-[#E2E8F0] line-clamp-2 leading-relaxed italic">
                    {article.lead}
                  </p>
                {/if}

                <p class="text-xs text-[#94A3B8] line-clamp-3 leading-relaxed">
                  {article.content.replace(/!\[.*?\]\(.*?\)/g, "[Bilde]").replace(/^##\s+/gm, "")}
                </p>
              </div>
            </div>

            <!-- Footer med Forfatter & Admin Hurtigknapper -->
            <div class="p-4 pt-2.5 border-t border-[#384252] flex items-center justify-between text-xs text-[#94A3B8]">
              <div class="flex items-center gap-2 truncate">
                <img
                  src={article.authorAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${article.authorName}`}
                  alt="Avatar"
                  class="w-6 h-6 rounded-full bg-[#191E24] border border-[#384252] object-cover shrink-0"
                />
                <span class="truncate font-medium text-[#E2E8F0]">{article.authorName}</span>
              </div>

              <!-- Admin Hurtighandlinger på kortet -->
              <div class="flex items-center gap-2 shrink-0">
                {#if currentUser?.role === "admin"}
                  <!-- Rediger-knapp -->
                  <button
                    onclick={(e) => openEditModal(article, e)}
                    class="p-1.5 rounded-lg bg-[#242B35] hover:bg-[#384252] text-[#9FE88D] border border-[#384252] transition-colors"
                    title="Rediger artikkel"
                  >
                    <Edit3 class="w-3.5 h-3.5" />
                  </button>

                  <!-- Pin-knapp -->
                  <button
                    onclick={(e) => {
                      e.stopPropagation();
                      onTogglePin(article._id);
                    }}
                    class={`p-1.5 rounded-lg border transition-colors ${
                      article.isPinned
                        ? "bg-[#F4C152] text-black border-[#F4C152]"
                        : "bg-[#242B35] hover:bg-[#384252] text-[#F4C152] border-[#384252]"
                    }`}
                    title={article.isPinned ? "Avfest fra toppen" : "Fest til toppen"}
                  >
                    <Pin class="w-3.5 h-3.5" />
                  </button>

                  <!-- Arkiver-knapp -->
                  <button
                    onclick={(e) => {
                      e.stopPropagation();
                      onToggleArchive(article._id);
                    }}
                    class="p-1.5 rounded-lg bg-[#242B35] hover:bg-[#384252] text-[#94A3B8] hover:text-white border border-[#384252] transition-colors"
                    title={article.isArchived ? "Gjenopprett artikkel" : "Arkiver artikkel"}
                  >
                    {#if article.isArchived}
                      <ArchiveRestore class="w-3.5 h-3.5 text-[#9FE88D]" />
                    {:else}
                      <Archive class="w-3.5 h-3.5" />
                    {/if}
                  </button>
                {/if}

                <!-- Like knapp -->
                <button
                  onclick={(e) => {
                    e.stopPropagation();
                    onLikeArticle(article._id);
                  }}
                  class="flex items-center gap-1 hover:text-[#FB6F84] transition-colors font-mono ml-1"
                >
                  <Heart class="w-3.5 h-3.5 text-[#FB6F84]" />
                  <span>{article.likes || 0}</span>
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- ========================================== -->
<!-- MODAL 1: LES FULL ARTIKKEL (AVIS-FORMAT)   -->
<!-- ========================================== -->
{#if selectedArticle}
  <div
    role="presentation"
    onclick={() => (selectedArticle = null)}
    class="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
  >
    <div
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      class="bg-[#2A303C] border border-[#384252] rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#E2E8F0] font-sans"
    >
      <!-- Toppheader med Admin-handlinger -->
      <div class="p-4 bg-[#191E24] border-b border-[#384252] flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2">
          <span class="text-xs uppercase font-bold text-[#9FE88D] bg-[#9FE88D]/15 px-3 py-1 rounded-lg border border-[#9FE88D]/30">
            {selectedArticle.tag || "Nyhet"}
          </span>
          {#if selectedArticle.isPinned}
            <span class="text-xs font-bold text-[#F4C152] bg-[#F4C152]/20 px-2.5 py-1 rounded-lg border border-[#F4C152]/40 flex items-center gap-1">
              <Pin class="w-3 h-3 fill-[#F4C152]" />
              <span>Festet</span>
            </span>
          {/if}
          {#if selectedArticle.isArchived}
            <span class="text-xs font-bold text-[#94A3B8] bg-[#242B35] px-2.5 py-1 rounded-lg border border-[#384252]">
              Arkivert
            </span>
          {/if}
        </div>

        <div class="flex items-center gap-2">
          {#if currentUser?.role === "admin"}
            <!-- Rediger -->
            <button
              onclick={() => openEditModal(selectedArticle)}
              class="px-3 py-1.5 rounded-xl bg-[#242B35] hover:bg-[#384252] text-white text-xs font-bold border border-[#384252] flex items-center gap-1.5 transition-colors"
              title="Rediger artikkel"
            >
              <Edit3 class="w-3.5 h-3.5 text-[#9FE88D]" />
              <span>Rediger</span>
            </button>

            <!-- Pin -->
            <button
              onclick={() => {
                onTogglePin(selectedArticle._id);
                selectedArticle.isPinned = !selectedArticle.isPinned;
              }}
              class="p-2 rounded-xl bg-[#242B35] hover:bg-[#384252] text-[#F4C152] border border-[#384252] transition-colors"
              title="Fest/avfest"
            >
              <Pin class="w-4 h-4" />
            </button>

            <!-- Arkiver -->
            <button
              onclick={() => {
                onToggleArchive(selectedArticle._id);
                selectedArticle.isArchived = !selectedArticle.isArchived;
              }}
              class="p-2 rounded-xl bg-[#242B35] hover:bg-[#384252] text-[#94A3B8] hover:text-white border border-[#384252] transition-colors"
              title="Arkiver / Gjenopprett"
            >
              {#if selectedArticle.isArchived}
                <ArchiveRestore class="w-4 h-4 text-[#9FE88D]" />
              {:else}
                <Archive class="w-4 h-4" />
              {/if}
            </button>

            <!-- Slett -->
            <button
              onclick={() => {
                if (confirm("Er du sikker på at du vil slette denne artikkelen permanent?")) {
                  onDeleteArticle(selectedArticle._id);
                  selectedArticle = null;
                }
              }}
              class="p-2 rounded-xl text-[#FB6F84] hover:bg-[#3b2222] transition-colors"
              title="Slett artikkel permanent (Admin)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          {/if}

          <button
            onclick={() => (selectedArticle = null)}
            class="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#242B35] transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Artikkelinnhold i ekte nettavis-stil -->
      <div class="flex-1 overflow-y-auto p-5 sm:p-8 space-y-5 custom-scrollbar">
        {#if selectedArticle.imageUrl}
          <div class="rounded-2xl overflow-hidden bg-[#191E24] border border-[#384252] max-h-96 shadow-md">
            <img
              src={selectedArticle.imageUrl}
              alt={selectedArticle.title}
              class="w-full h-full object-cover"
            />
          </div>
        {/if}

        <h1 class="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
          {selectedArticle.title}
        </h1>

        <div class="flex items-center justify-between pb-4 border-b border-[#384252] text-xs text-[#94A3B8]">
          <div class="flex items-center gap-2.5">
            <img
              src={selectedArticle.authorAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedArticle.authorName}`}
              alt="Avatar"
              class="w-8 h-8 rounded-full bg-[#191E24] border border-[#384252] object-cover"
            />
            <div>
              <span class="font-bold text-white block text-sm">{selectedArticle.authorName}</span>
              <span class="text-[11px] text-[#94A3B8]">{new Date(selectedArticle.createdAt).toLocaleString("no-NO", { dateStyle: "long", timeStyle: "short" })}</span>
            </div>
          </div>

          <button
            onclick={() => onLikeArticle(selectedArticle._id)}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#242B35] hover:bg-[#384252] text-white border border-[#384252] transition-colors"
          >
            <Heart class="w-4 h-4 text-[#FB6F84] fill-[#FB6F84]/20" />
            <span class="font-mono font-bold text-xs">{selectedArticle.likes || 0}</span>
          </button>
        </div>

        {#if selectedArticle.lead}
          <div class="p-4 rounded-xl bg-[#242B35] border-l-4 border-[#9FE88D] text-base sm:text-lg font-semibold text-white leading-relaxed italic shadow-sm">
            {selectedArticle.lead}
          </div>
        {/if}

        <div class="space-y-4 text-sm sm:text-base text-[#E2E8F0] leading-relaxed">
          {#each renderFormattedArticle(selectedArticle.content) as block}
            {#if block.type === "heading"}
              <h2 class="text-xl sm:text-2xl font-bold text-white pt-4 pb-1 border-b border-[#384252]">
                {block.text}
              </h2>
            {:else if block.type === "quote"}
              <blockquote class="p-4 my-3 rounded-r-xl bg-[#242B35] border-l-4 border-[#F4C152] text-base font-serif italic text-[#F4C152]">
                "{block.text}"
              </blockquote>
            {:else if block.type === "image"}
              <figure class="my-5 rounded-2xl overflow-hidden bg-[#191E24] border border-[#384252]">
                <img
                  src={block.src}
                  alt={block.caption || "Artikkelbilde"}
                  class="w-full max-h-[450px] object-cover"
                />
                {#if block.caption}
                  <figcaption class="p-2.5 text-xs text-[#94A3B8] bg-[#191E24] border-t border-[#384252] italic text-center">
                    📸 {block.caption}
                  </figcaption>
                {/if}
              </figure>
            {:else if block.type === "list"}
              <ul class="list-disc list-inside space-y-1.5 pl-2 my-2 text-sm text-[#E2E8F0]">
                {#each block.items || [] as item}
                  <li>{item}</li>
                {/each}
              </ul>
            {:else}
              <p class="whitespace-pre-wrap leading-relaxed">
                {block.text}
              </p>
            {/if}
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- ========================================== -->
<!-- MODAL 2: OPPRETT / REDIGER ARTIKKEL        -->
<!-- ========================================== -->
{#if isCreateModalOpen}
  <div
    role="presentation"
    onclick={() => (isCreateModalOpen = false)}
    class="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
  >
    <div
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      class="bg-[#2A303C] border border-[#384252] rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#E2E8F0] font-sans"
    >
      <!-- Header med Rediger/Forhåndsvisning Faner -->
      <div class="p-4 bg-[#191E24] border-b border-[#384252] flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-[#9FE88D]/15 text-[#9FE88D]">
            <Edit3 class="w-4 h-4" />
          </div>
          <span class="font-bold text-sm sm:text-base text-white">
            {editingArticleId ? "Rediger artikkel" : "Skriv ny artikkel eller runderapport"}
          </span>
        </div>

        <!-- Faner -->
        <div class="flex items-center gap-2">
          <div class="flex items-center p-0.5 rounded-lg bg-[#191E24] border border-[#384252] text-xs">
            <button
              onclick={() => (editorTab = "write")}
              class={`px-3 py-1 rounded-md font-bold transition-colors flex items-center gap-1.5 ${
                editorTab === "write"
                  ? "bg-[#9FE88D] text-[#16380c] shadow-sm"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <Edit3 class="w-3.5 h-3.5" />
              <span>Skriv</span>
            </button>

            <button
              onclick={() => (editorTab = "preview")}
              class={`px-3 py-1 rounded-md font-bold transition-colors flex items-center gap-1.5 ${
                editorTab === "preview"
                  ? "bg-[#9FE88D] text-[#16380c] shadow-sm"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <Eye class="w-3.5 h-3.5" />
              <span>Forhåndsvisning</span>
            </button>
          </div>

          <button
            onclick={() => (isCreateModalOpen = false)}
            class="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#242B35] transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Skriveområde -->
      <div class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar">
        {#if editorTab === "write"}
          <!-- Tittel & Kategori -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="sm:col-span-2">
              <label for="art-edit-title" class="block text-xs font-bold text-[#94A3B8] uppercase mb-1">
                Artikkeltittel / Hovedoverskrift *
              </label>
              <input
                id="art-edit-title"
                type="text"
                bind:value={articleTitle}
                placeholder="f.eks. Taktisk mesterstykke fra A1 i Gameweek 1"
                class="w-full px-3.5 py-2.5 rounded-xl bg-[#191E24] border border-[#384252] text-white text-sm font-bold focus:outline-none focus:border-[#9FE88D]"
              />
            </div>

            <div>
              <label for="art-edit-tag" class="block text-xs font-bold text-[#94A3B8] uppercase mb-1">
                Kategori
              </label>
              <select
                id="art-edit-tag"
                bind:value={articleTag}
                class="w-full px-3.5 py-2.5 rounded-xl bg-[#191E24] border border-[#384252] text-white text-sm focus:outline-none focus:border-[#9FE88D]"
              >
                <option value="Runderapport">Runderapport</option>
                <option value="Taktikk">Taktisk Analyse</option>
                <option value="Overganger">Overganger & Råd</option>
                <option value="Banter">Banter & Reaksjoner</option>
                <option value="Nyhet">Offisiell Nyhet</option>
              </select>
            </div>
          </div>

          <!-- Cover / Header Bilde (Valgfritt) -->
          <div class="p-3.5 rounded-xl bg-[#191E24] border border-[#384252] space-y-2">
            <div class="flex items-center justify-between">
              <label for="art-cover-input" class="text-xs font-bold text-[#94A3B8] uppercase flex items-center gap-1.5">
                <Image class="w-3.5 h-3.5 text-[#9FE88D]" />
                <span>Header / Coverbilde (Toppen av artikkelen - Valgfritt)</span>
              </label>
              {#if articleCoverUrl}
                <button
                  type="button"
                  onclick={() => (articleCoverUrl = "")}
                  class="text-xs text-[#FB6F84] hover:underline"
                >
                  Fjern coverbilde
                </button>
              {/if}
            </div>

            {#if articleCoverUrl}
              <div class="relative max-h-36 rounded-lg overflow-hidden border border-[#384252]">
                <img src={articleCoverUrl} alt="Cover" class="w-full h-36 object-cover" />
              </div>
            {:else}
              <input
                id="art-cover-input"
                type="file"
                accept="image/*"
                onchange={handleCoverFileSelect}
                class="text-xs text-[#94A3B8] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#242B35] file:text-[#9FE88D] hover:file:bg-[#384252] cursor-pointer"
              />
            {/if}
          </div>

          <!-- Ingress (Lead Paragraph) -->
          <div>
            <label for="art-edit-lead" class="block text-xs font-bold text-[#9FE88D] uppercase mb-1 flex items-center gap-1.5">
              <Sparkles class="w-3.5 h-3.5 text-[#9FE88D]" />
              <span>Ingress (Kort, fengende oppsummering / innledning)</span>
            </label>
            <textarea
              id="art-edit-lead"
              rows="2"
              bind:value={articleLead}
              placeholder="Skriv 1-2 setninger som fanger oppmerksomheten og oppsummerer saken..."
              class="w-full px-3.5 py-2.5 rounded-xl bg-[#191E24] border border-[#9FE88D]/40 text-white text-sm font-medium focus:outline-none focus:border-[#9FE88D] custom-scrollbar leading-relaxed"
            ></textarea>
          </div>

          <!-- Verktøylinje for skriveverktøy -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs text-[#94A3B8] font-bold uppercase">
              <span>Hovedtekst & Avsnitt *</span>
              <span class="text-[11px] font-normal normal-case text-[#94A3B8]">Bruk verktøylinjen for overskrifter og bilder</span>
            </div>

            <!-- Toolbar -->
            <div class="p-1.5 rounded-xl bg-[#191E24] border border-[#384252] flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onclick={() => insertFormat("h2")}
                class="px-2.5 py-1 rounded-lg bg-[#242B35] hover:bg-[#384252] text-white flex items-center gap-1 font-bold"
                title="Sett inn underoverskrift"
              >
                <Heading2 class="w-3.5 h-3.5 text-[#9FE88D]" />
                <span>Overskrift</span>
              </button>

              <button
                type="button"
                onclick={() => insertFormat("bold")}
                class="px-2.5 py-1 rounded-lg bg-[#242B35] hover:bg-[#384252] text-white flex items-center gap-1 font-bold"
                title="Fet tekst"
              >
                <Bold class="w-3.5 h-3.5 text-white" />
                <span>Fet</span>
              </button>

              <button
                type="button"
                onclick={() => insertFormat("italic")}
                class="px-2.5 py-1 rounded-lg bg-[#242B35] hover:bg-[#384252] text-white flex items-center gap-1 italic"
                title="Kursiv tekst"
              >
                <Italic class="w-3.5 h-3.5 text-white" />
                <span>Kursiv</span>
              </button>

              <button
                type="button"
                onclick={() => insertFormat("quote")}
                class="px-2.5 py-1 rounded-lg bg-[#242B35] hover:bg-[#384252] text-white flex items-center gap-1"
                title="Sett inn sitat / pull-quote"
              >
                <Quote class="w-3.5 h-3.5 text-[#F4C152]" />
                <span>Sitat</span>
              </button>

              <button
                type="button"
                onclick={() => insertFormat("list")}
                class="px-2.5 py-1 rounded-lg bg-[#242B35] hover:bg-[#384252] text-white flex items-center gap-1"
                title="Punktliste"
              >
                <List class="w-3.5 h-3.5 text-[#70E1F8]" />
                <span>Liste</span>
              </button>

              <div class="h-4 w-[1px] bg-[#384252] mx-1"></div>

              <!-- Sett inn bilde i artikkelen knapp -->
              <button
                type="button"
                onclick={() => (isImageModalOpen = true)}
                class="px-3 py-1 rounded-lg bg-[#9FE88D]/20 hover:bg-[#9FE88D]/30 text-[#9FE88D] border border-[#9FE88D]/40 flex items-center gap-1.5 font-bold"
                title="Sett inn bilde inne i artikkelteksten med bildetekst"
              >
                <Image class="w-3.5 h-3.5 text-[#9FE88D]" />
                <span>+ Sett inn bilde i teksten</span>
              </button>
            </div>

            <!-- Hovedtekst textarea -->
            <textarea
              bind:this={textareaRef}
              rows="10"
              bind:value={articleContent}
              placeholder="Skriv artikkelen din her. Bruk verktøylinjen over for å sette inn underoverskrifter, sitater og bilder direkte i teksten..."
              class="w-full p-4 rounded-xl bg-[#191E24] border border-[#384252] text-white text-sm focus:outline-none focus:border-[#9FE88D] custom-scrollbar leading-relaxed font-sans"
            ></textarea>
          </div>

        {:else}
          <!-- LIVE FORHÅNDSVISNING AV ARTIKKELEN -->
          <div class="p-4 sm:p-6 rounded-2xl bg-[#191E24] border border-[#384252] space-y-4">
            <span class="text-xs uppercase font-bold text-[#9FE88D] bg-[#9FE88D]/15 px-2.5 py-0.5 rounded border border-[#9FE88D]/30">
              {articleTag}
            </span>

            {#if articleCoverUrl}
              <div class="rounded-xl overflow-hidden max-h-72 border border-[#384252]">
                <img src={articleCoverUrl} alt="Cover" class="w-full h-full object-cover" />
              </div>
            {/if}

            <h1 class="text-2xl sm:text-3xl font-black text-white leading-tight">
              {articleTitle || "Uten tittel"}
            </h1>

            <div class="flex items-center gap-2 text-xs text-[#94A3B8] pb-3 border-b border-[#384252]">
              <span class="font-bold text-white">{currentUser?.username || "Admin"}</span>
              <span>•</span>
              <span>{new Date().toLocaleDateString("no-NO")}</span>
            </div>

            {#if articleLead}
              <div class="p-3.5 rounded-xl bg-[#242B35] border-l-4 border-[#9FE88D] text-base font-semibold text-white italic">
                {articleLead}
              </div>
            {/if}

            <div class="space-y-3.5 text-sm sm:text-base text-[#E2E8F0] leading-relaxed">
              {#each renderFormattedArticle(articleContent) as block}
                {#if block.type === "heading"}
                  <h2 class="text-xl font-bold text-white pt-3 pb-1 border-b border-[#384252]">
                    {block.text}
                  </h2>
                {:else if block.type === "quote"}
                  <blockquote class="p-3.5 my-2 rounded-r-xl bg-[#242B35] border-l-4 border-[#F4C152] font-serif italic text-[#F4C152]">
                    "{block.text}"
                  </blockquote>
                {:else if block.type === "image"}
                  <figure class="my-4 rounded-xl overflow-hidden bg-[#191E24] border border-[#384252]">
                    <img src={block.src} alt={block.caption} class="w-full max-h-96 object-cover" />
                    {#if block.caption}
                      <figcaption class="p-2 text-xs text-[#94A3B8] bg-[#191E24] text-center italic">
                        📸 {block.caption}
                      </figcaption>
                    {/if}
                  </figure>
                {:else if block.type === "list"}
                  <ul class="list-disc list-inside space-y-1 pl-2 text-sm">
                    {#each block.items || [] as item}
                      <li>{item}</li>
                    {/each}
                  </ul>
                {:else}
                  <p class="whitespace-pre-wrap">{block.text}</p>
                {/if}
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer Handlinger -->
      <div class="p-4 bg-[#191E24] border-t border-[#384252] flex items-center justify-between shrink-0">
        <div class="text-xs text-[#94A3B8]">
          {#if editorTab === "write"}
            <span>Trykk <strong>Forhåndsvisning</strong> øverst for å se ferdig layout</span>
          {:else}
            <span>Klar til å lagre!</span>
          {/if}
        </div>

        <div class="flex items-center gap-2">
          <button
            onclick={() => (isCreateModalOpen = false)}
            class="px-4 py-2 rounded-xl bg-[#242B35] hover:bg-[#384252] text-xs sm:text-sm font-semibold text-[#E2E8F0] border border-[#384252] transition-colors"
          >
            Avbryt
          </button>

          <button
            onclick={handleSaveArticle}
            disabled={isSubmitting || !articleTitle.trim() || !articleContent.trim()}
            class="px-5 py-2 rounded-xl bg-[#9FE88D] hover:bg-[#8ce078] text-[#16380c] font-bold text-xs sm:text-sm transition-all flex items-center gap-2 disabled:opacity-40 shadow-sm"
          >
            {#if editingArticleId}
              <Check class="w-4 h-4" />
              <span>{isSubmitting ? "Lagrer endringer..." : "Lagre endringer"}</span>
            {:else}
              <Send class="w-4 h-4" />
              <span>{isSubmitting ? "Publiserer..." : "Publiser artikkel"}</span>
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- ========================================== -->
<!-- MODAL 3: SETT INN BILDE I ARTIKKELEN DIALOG-->
<!-- ========================================== -->
{#if isImageModalOpen}
  <div
    role="presentation"
    onclick={() => (isImageModalOpen = false)}
    class="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
  >
    <div
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      class="bg-[#2A303C] border border-[#384252] rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl animate-in zoom-in-95 text-[#E2E8F0]"
    >
      <div class="flex items-center justify-between pb-2 border-b border-[#384252]">
        <h3 class="text-sm sm:text-base font-bold text-white flex items-center gap-2">
          <Image class="w-4 h-4 text-[#9FE88D]" />
          <span>Sett inn bilde i artikkelen</span>
        </h3>
        <button
          onclick={() => (isImageModalOpen = false)}
          class="p-1 rounded-lg text-[#94A3B8] hover:text-white"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Dra/Slipp & Utklippstavle sone -->
      <div
        role="region"
        aria-label="Område for bilde"
        tabindex="0"
        onpaste={handleInlinePaste}
        class="border-2 border-dashed border-[#384252] hover:border-[#9FE88D] rounded-xl p-5 text-center bg-[#191E24] space-y-2 focus:outline-none focus:border-[#9FE88D]"
      >
        {#if inlineImageUrl}
          <div class="relative max-h-48 rounded-lg overflow-hidden border border-[#384252] inline-block">
            <img src={inlineImageUrl} alt="Forhåndsvisning" class="max-h-48 object-cover rounded-lg" />
            <button
              type="button"
              onclick={() => (inlineImageUrl = "")}
              class="absolute top-2 right-2 p-1.5 bg-black/80 rounded-full text-white hover:bg-black"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        {:else}
          <div class="flex flex-col items-center justify-center space-y-1 text-xs text-[#94A3B8]">
            <Upload class="w-7 h-7 text-[#9FE88D] mb-1" />
            <p class="font-bold text-white text-sm">Lim inn fra utklippstavle (Ctrl+V) eller velg fil</p>
            <p class="text-xs">Bildet legges inn der markøren står i teksten.</p>
            <input
              type="file"
              accept="image/*"
              onchange={handleInlineFileSelect}
              class="mt-2 text-xs text-[#94A3B8] file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#242B35] file:text-[#9FE88D] hover:file:bg-[#384252] cursor-pointer"
            />
          </div>
        {/if}
      </div>

      <!-- Bildetekst (Caption) -->
      <div>
        <label for="img-caption" class="block text-xs font-bold text-[#94A3B8] uppercase mb-1">
          Bildetekst / Caption (Valgfritt)
        </label>
        <input
          id="img-caption"
          type="text"
          bind:value={inlineImageCaption}
          placeholder="f.eks. A1 feirer 3 poeng på overtid"
          class="w-full px-3.5 py-2 rounded-xl bg-[#191E24] border border-[#384252] text-white text-xs sm:text-sm focus:outline-none focus:border-[#9FE88D]"
        />
      </div>

      <!-- Handlinger -->
      <div class="flex items-center justify-end gap-2 pt-2 border-t border-[#384252]">
        <button
          onclick={() => (isImageModalOpen = false)}
          class="px-3.5 py-2 rounded-xl bg-[#242B35] hover:bg-[#384252] text-xs font-semibold text-[#E2E8F0]"
        >
          Avbryt
        </button>

        <button
          onclick={insertInlineImage}
          disabled={!inlineImageUrl}
          class="px-4 py-2 rounded-xl bg-[#9FE88D] hover:bg-[#8ce078] text-[#16380c] text-xs font-bold disabled:opacity-40 transition-all flex items-center gap-1.5"
        >
          <span>Sett inn i teksten</span>
        </button>
      </div>
    </div>
  </div>
{/if}
