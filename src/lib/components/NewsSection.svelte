<script lang="ts">
  import {
    Newspaper,
    Plus,
    Heart,
    Image as ImageIcon,
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
    Sliders,
    Maximize2,
    AlignLeft,
    AlignRight,
    AlignCenter,
    Info,
    Flame,
  } from "lucide-svelte";
  import { useMutation } from "$lib/convex.svelte";
  import { api } from "../../../convex/_generated/api";
  import { formatConvexError } from "$lib/utils/formatError";

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

  const generateUploadUrlMutation = useMutation(api.articles.generateArticleUploadUrl);
  const saveUploadedImageMutation = useMutation(api.articles.saveArticleUploadedImage);

  let isCreateModalOpen = $state(false);
  let editingArticleId = $state<string | null>(null);
  let selectedArticle = $state<any>(null);
  let zoomedImageUrl = $state<string | null>(null);
  let editorTab = $state<"write" | "preview">("write");
  let activeFilterTab = $state<"active" | "archived" | "all">("active");

  // Skjema state
  let articleTitle = $state("");
  let articleLead = $state("");
  let articleContent = $state("");
  let articleTag = $state("Runderapport");
  let articleCoverUrl = $state("");
  let articleImagePosition = $state(50); // 0% - 100% vertikalt
  let articleImageHeight = $state<"banner" | "standard" | "large" | "natural">("standard");
  let articleImageFit = $state<"cover" | "contain">("cover");
  let isSubmitting = $state(false);
  let isUploadingCover = $state(false);
  let isUploadingInline = $state(false);

  // Inline bilde-dialog state
  let isImageModalOpen = $state(false);
  let inlineImageUrl = $state("");
  let inlineImageCaption = $state("");
  let inlineImageAlign = $state<"full" | "left" | "right" | "center">("full");
  let textareaRef: HTMLTextAreaElement | null = $state(null);
  let coverFileInputRef: HTMLInputElement | null = $state(null);
  let inlineFileInputRef: HTMLInputElement | null = $state(null);

  const presetCovers = [
    { name: "Stadion", url: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80" },
    { name: "Taktikktavle", url: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=1200&q=80" },
    { name: "Feiring", url: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80" },
    { name: "Gulltrofé", url: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80" },
    { name: "Kampball", url: "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1200&q=80" },
  ];

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

  // Sjekk om innlogget bruker har rettighet til å redigere/slette artikkelen (Forfatter eller Admin)
  function canManageArticle(article: any): boolean {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    if (article.authorId && currentUser._id && article.authorId === currentUser._id) return true;
    if (article.authorName && currentUser.username && article.authorName.toLowerCase() === currentUser.username.toLowerCase()) return true;
    return false;
  }

  // Sjekk om innlogget bruker allerede har likt artikkelen
  function hasUserLiked(article: any): boolean {
    if (!currentUser) return false;
    const userKey = currentUser._id || currentUser.username;
    return article.likedBy?.includes(userKey) ?? false;
  }

  function openCreateModal() {
    editingArticleId = null;
    articleTitle = "";
    articleLead = "";
    articleContent = "";
    articleCoverUrl = "";
    articleImagePosition = 50;
    articleImageHeight = "standard";
    articleImageFit = "cover";
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
    articleImagePosition = article.imagePosition ?? 50;
    articleImageHeight = article.imageHeight || "standard";
    articleImageFit = article.imageFit || "cover";
    articleTag = article.tag || "Runderapport";
    editorTab = "write";
    isCreateModalOpen = true;
    if (selectedArticle && selectedArticle._id === article._id) {
      selectedArticle = null;
    }
  }

  // Last opp toppbilde / coverbilde via Convex Storage
  async function handleCoverImageFile(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Bildet er for stort. Maks filstørrelse er 10 MB.");
      return;
    }

    isUploadingCover = true;
    try {
      const postUrl = await generateUploadUrlMutation.mutate({});
      const res = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await res.json();
      const publicUrl = await saveUploadedImageMutation.mutate({ storageId });
      if (publicUrl) {
        articleCoverUrl = publicUrl;
      }
    } catch (err: any) {
      alert(formatConvexError(err, "Kunne ikke laste opp toppbilde."));
    } finally {
      isUploadingCover = false;
    }
  }

  // Last opp bilde for innsetting i tekst via Convex Storage
  async function handleInlineImageFile(file: File): Promise<string | null> {
    if (file.size > 10 * 1024 * 1024) {
      alert("Bildet er for stort. Maks filstørrelse er 10 MB.");
      return null;
    }

    isUploadingInline = true;
    try {
      const postUrl = await generateUploadUrlMutation.mutate({});
      const res = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await res.json();
      const publicUrl = await saveUploadedImageMutation.mutate({ storageId });
      return publicUrl || null;
    } catch (err: any) {
      alert(formatConvexError(err, "Kunne ikke laste opp bilde til Convex storage."));
      return null;
    } finally {
      isUploadingInline = false;
    }
  }

  // Håndter utklippstavle (Ctrl+V) direkte i teksteditoren
  async function handleTextareaPaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          const uploadedUrl = await handleInlineImageFile(file);
          if (uploadedUrl) {
            insertAtCursor(`\n\n![Bilde](${uploadedUrl})\n\n`);
          }
          break;
        }
      }
    }
  }

  // Håndter modal utklippstavle
  async function handleModalPaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          const uploadedUrl = await handleInlineImageFile(file);
          if (uploadedUrl) {
            inlineImageUrl = uploadedUrl;
          }
          break;
        }
      }
    }
  }

  function insertInlineImage() {
    if (!inlineImageUrl) {
      alert("Vennligst last opp eller lim inn en bilde-URL først.");
      return;
    }

    const caption = inlineImageCaption.trim() || "Bilde";
    let tag = `![${caption}](${inlineImageUrl})`;
    if (inlineImageAlign !== "full") {
      tag = `![${caption}|align=${inlineImageAlign}](${inlineImageUrl})`;
    }

    insertAtCursor(`\n\n${tag}\n\n`);

    inlineImageUrl = "";
    inlineImageCaption = "";
    inlineImageAlign = "full";
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

  function insertFormat(type: "h2" | "bold" | "italic" | "quote" | "list" | "callout" | "matchbox") {
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
        insertAtCursor('\n\n> "Dette er et uforglemmelig sitat fra runden..."\n\n');
        break;
      case "list":
        insertAtCursor("\n\n- Viktig høydepunkt 1\n- Viktig høydepunkt 2\n- Viktig høydepunkt 3\n\n");
        break;
      case "callout":
        insertAtCursor("\n\n> [!NOTE]\n> **Viktig liganyhet:** Fristen for neste runde stenger fredag 19:30!\n\n");
        break;
      case "matchbox":
        insertAtCursor("\n\n> [!TIP]\n> 🏆 **Ukens Toppoppgjør:**\n> Rom 1 (142p) slo Rom 4 (138p) med kun 4 poengs margin!\n\n");
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
          imagePosition: articleImagePosition,
          imageFit: articleImageFit,
          imageHeight: articleImageHeight,
        });
      } else {
        // Opprett ny artikkel
        await onCreateArticle({
          title: articleTitle.trim(),
          lead: articleLead.trim() || undefined,
          content: articleContent.trim(),
          tag: articleTag,
          imageUrl: articleCoverUrl || undefined,
          imagePosition: articleImagePosition,
          imageFit: articleImageFit,
          imageHeight: articleImageHeight,
          authorName: currentUser?.username || "Admin",
          authorAvatar: currentUser?.avatar,
        });
      }

      editingArticleId = null;
      articleTitle = "";
      articleLead = "";
      articleContent = "";
      articleCoverUrl = "";
      articleImagePosition = 50;
      articleImageHeight = "standard";
      articleImageFit = "cover";
      articleTag = "Runderapport";
      isCreateModalOpen = false;
      editorTab = "write";
    } catch (err: any) {
      alert(formatConvexError(err, "Kunne ikke lagre artikkel."));
    } finally {
      isSubmitting = false;
    }
  }

  // Robust Markdown & Block parser
  function renderFormattedArticle(content: string) {
    if (!content) return [];

    const blocks: Array<{
      type: "paragraph" | "heading" | "quote" | "callout" | "image" | "list";
      text?: string;
      src?: string;
      caption?: string;
      align?: "full" | "left" | "right" | "center";
      calloutType?: "NOTE" | "TIP" | "WARNING" | "IMPORTANT";
      items?: string[];
    }> = [];

    const rawBlocks = content.split(/\n\n+/);

    for (const raw of rawBlocks) {
      const trimmed = raw.trim();
      if (!trimmed) continue;

      // Sjekk om det finnes bilder i blokken
      const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
      if (imgRegex.test(trimmed)) {
        let lastIndex = 0;
        imgRegex.lastIndex = 0;
        let match;
        while ((match = imgRegex.exec(trimmed)) !== null) {
          const preText = trimmed.substring(lastIndex, match.index).trim();
          if (preText) {
            blocks.push({ type: "paragraph", text: preText });
          }

          let rawCaption = match[1] || "";
          const src = match[2];
          let align: "full" | "left" | "right" | "center" = "full";

          if (rawCaption.includes("|align=")) {
            const parts = rawCaption.split("|align=");
            rawCaption = parts[0];
            align = (parts[1].split("|")[0].trim() as any) || "full";
          } else if (rawCaption.includes("|left")) {
            rawCaption = rawCaption.replace("|left", "");
            align = "left";
          } else if (rawCaption.includes("|right")) {
            rawCaption = rawCaption.replace("|right", "");
            align = "right";
          } else if (rawCaption.includes("|center")) {
            rawCaption = rawCaption.replace("|center", "");
            align = "center";
          }

          blocks.push({
            type: "image",
            caption: rawCaption.trim(),
            src,
            align,
          });

          lastIndex = match.index + match[0].length;
        }

        const postText = trimmed.substring(lastIndex).trim();
        if (postText) {
          blocks.push({ type: "paragraph", text: postText });
        }
        continue;
      }

      // Callout boks: > [!NOTE] eller > [!TIP]
      const calloutMatch = trimmed.match(/^>\s*\[!(NOTE|TIP|WARNING|IMPORTANT)\]\s*\n?([\s\S]*)/i);
      if (calloutMatch) {
        const cType = calloutMatch[1].toUpperCase() as any;
        const cText = calloutMatch[2].replace(/^>\s?/gm, "").trim();
        blocks.push({
          type: "callout",
          calloutType: cType,
          text: cText,
        });
        continue;
      }

      // Overskrift
      if (trimmed.startsWith("## ")) {
        blocks.push({
          type: "heading",
          text: trimmed.replace(/^##\s+/, ""),
        });
        continue;
      }

      // Sitat
      if (trimmed.startsWith("> ")) {
        blocks.push({
          type: "quote",
          text: trimmed.replace(/^>\s+/, "").replace(/^"(.*)"$/, "$1"),
        });
        continue;
      }

      // Punktliste
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

      // Standard avsnitt
      blocks.push({
        type: "paragraph",
        text: trimmed,
      });
    }

    return blocks;
  }

  function getCoverHeightClass(height?: string) {
    switch (height) {
      case "banner":
        return "h-40 sm:h-48";
      case "large":
        return "h-72 sm:h-96";
      case "natural":
        return "max-h-[500px] h-auto";
      default:
        return "h-56 sm:h-64";
    }
  }
</script>

<div class="flex-1 flex flex-col h-full bg-[#2A303C] rounded-2xl border border-[#384252] shadow-sm overflow-hidden text-[#E2E8F0] font-sans">
  <!-- Toppheader med faner og Opprett-knapp -->
  <div class="p-4 border-b border-[#384252] bg-[#191E24] flex flex-wrap items-center justify-between gap-3 shrink-0">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-xl bg-[#F471B5]/15 border border-[#F471B5]/30 text-[#F471B5]">
        <Newspaper class="w-5 h-5" />
      </div>
      <div>
        <h2 class="text-base font-bold text-white flex items-center gap-2">
          <span>Nyheter</span>
          <span class="text-xs px-2.5 py-0.5 rounded-full bg-[#2A303C] text-[#F471B5] font-bold border border-[#384252]">
            {activeCount} artikler
          </span>
        </h2>
        <p class="text-xs text-[#94A3B8]">Runderapporter, taktikkspalter, overgangsrykter og analyser</p>
      </div>
    </div>

    <!-- Høyre: Filterfaner & Opprett Nyhet (for Admin) -->
    <div class="flex items-center gap-2">
      <!-- Faner: Aktive / Arkiv -->
      <div class="flex items-center gap-1 p-1 bg-[#242B35] rounded-xl border border-[#384252] text-xs">
        <button
          onclick={() => (activeFilterTab = "active")}
          class={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
            activeFilterTab === "active"
              ? "bg-[#F471B5] text-black shadow-sm"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          Aktive ({activeCount})
        </button>
        <button
          onclick={() => (activeFilterTab = "archived")}
          class={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
            activeFilterTab === "archived"
              ? "bg-[#F471B5] text-black shadow-sm"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          Arkiv ({archivedCount})
        </button>
      </div>

      {#if currentUser}
        <button
          onclick={openCreateModal}
          class="px-3.5 py-2 rounded-xl bg-[#9FE88D] hover:bg-[#8fd97e] text-[#16380c] text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
        >
          <Plus class="w-4 h-4" />
          <span>Skriv nyhet</span>
        </button>
      {/if}
    </div>
  </div>

  <!-- Artikkelstrøm (Nettavis Grid) -->
  <div class="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
    {#if displayedArticles.length === 0}
      <div class="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-[#94A3B8]">
        <div class="w-14 h-14 rounded-2xl bg-[#242B35] border border-[#384252] flex items-center justify-center text-[#F471B5] mb-1">
          <Newspaper class="w-7 h-7" />
        </div>
        <p class="text-base font-bold text-white">Ingen nyheter publisert her enda</p>
        <p class="text-xs text-[#94A3B8] max-w-sm">
          {currentUser?.role === "admin"
            ? "Trykk på 'Skriv nyhet' øverst for å publisere den første runderapporten med bilder og sitater!"
            : "Ligaledelsen vil publisere runderapporter og nyheter her etter hvert som runden spilles."}
        </p>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {#each displayedArticles as article (article._id)}
          {@const liked = hasUserLiked(article)}
          <div
            role="button"
            tabindex="0"
            onclick={() => (selectedArticle = article)}
            onkeydown={(e) => (e.key === "Enter" || e.key === " ") && (selectedArticle = article)}
            class={`rounded-2xl bg-[#242B35] border transition-all cursor-pointer flex flex-col overflow-hidden group shadow-sm hover:shadow-xl hover:-translate-y-0.5 ${
              article.isPinned
                ? "border-[#F4C152]/70 ring-1 ring-[#F4C152]/20"
                : "border-[#384252] hover:border-[#F471B5]/60"
            }`}
          >
            <!-- Toppbilde / Cover hvis finnes -->
            {#if article.imageUrl}
              <div class="relative h-44 w-full bg-[#191E24] overflow-hidden shrink-0 border-b border-[#384252]">
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  style={`object-position: center ${article.imagePosition ?? 50}%; object-fit: ${article.imageFit || "cover"};`}
                  class="w-full h-full group-hover:scale-105 transition-transform duration-300"
                />
                {#if article.isPinned}
                  <span class="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-[#F4C152] text-black text-[10px] font-bold flex items-center gap-1 shadow-md">
                    <Pin class="w-3 h-3 fill-black" />
                    <span>Festet</span>
                  </span>
                {/if}
              </div>
            {/if}

            <div class="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
              <div class="space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[10px] uppercase font-bold text-[#F471B5] bg-[#F471B5]/15 px-2 py-0.5 rounded-md border border-[#F471B5]/30">
                    {article.tag || "Nyhet"}
                  </span>
                  <span class="text-[11px] text-[#94A3B8] font-mono">
                    {new Date(article.createdAt).toLocaleDateString("no-NO", { month: "short", day: "numeric" })}
                  </span>
                </div>

                <h3 class="text-base font-bold text-white group-hover:text-[#F471B5] transition-colors leading-snug line-clamp-2">
                  {article.title}
                </h3>

                {#if article.lead}
                  <p class="text-xs text-[#94A3B8] line-clamp-2 leading-relaxed">
                    {article.lead}
                  </p>
                {/if}
              </div>

              <!-- Footer med forfatter og handlinger -->
              <div class="pt-3 border-t border-[#384252] flex items-center justify-between text-xs text-[#94A3B8]">
                <div class="flex items-center gap-2 truncate">
                  <img
                    src={article.authorAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${article.authorName}`}
                    alt="Avatar"
                    class="w-5 h-5 rounded-full bg-[#191E24] border border-[#384252] object-cover"
                  />
                  <span class="font-medium text-white truncate text-[11px]">{article.authorName}</span>
                </div>

                <div class="flex items-center gap-2">
                  {#if canManageArticle(article)}
                    <!-- Rediger-knapp (Forfatter eller Admin) -->
                    <button
                      onclick={(e) => openEditModal(article, e)}
                      class="p-1 rounded text-[#94A3B8] hover:text-[#9FE88D] transition-colors"
                      title="Rediger artikkel"
                    >
                      <Edit3 class="w-3.5 h-3.5" />
                    </button>
                  {/if}

                  {#if currentUser?.role === "admin"}
                    <!-- Pin-knapp (Kun Admin) -->
                    <button
                      onclick={(e) => {
                        e.stopPropagation();
                        onTogglePin(article._id);
                      }}
                      class={`p-1 rounded transition-colors ${
                        article.isPinned ? "text-[#F4C152]" : "text-[#94A3B8] hover:text-[#F4C152]"
                      }`}
                      title={article.isPinned ? "Avfest fra toppen" : "Fest til toppen"}
                    >
                      <Pin class="w-3.5 h-3.5" />
                    </button>
                  {/if}

                  <!-- Likes (1 per bruker toggle) -->
                  <button
                    onclick={(e) => {
                      e.stopPropagation();
                      onLikeArticle(article._id);
                    }}
                    class={`flex items-center gap-1 transition-colors font-mono text-xs px-2 py-0.5 rounded-lg border ${
                      liked
                        ? "bg-[#FB6F84]/20 text-[#FB6F84] border-[#FB6F84]/40 font-bold"
                        : "text-[#94A3B8] hover:text-[#FB6F84] border-transparent hover:border-[#384252]"
                    }`}
                    title={liked ? "Fjern likerklikk" : "Lik denne artikkelen (1 per bruker)"}
                  >
                    <Heart class={`w-3.5 h-3.5 ${liked ? "fill-[#FB6F84] text-[#FB6F84]" : "text-[#FB6F84]"}`} />
                    <span>{article.likes || 0}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- ============================================================== -->
<!-- MODAL 1: LES FULL ARTIKKEL (EKTE NETTAVIS-DESIGN)               -->
<!-- ============================================================== -->
{#if selectedArticle}
  {@const modalLiked = hasUserLiked(selectedArticle)}
  <div class="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
    <button
      type="button"
      aria-label="Lukk modal"
      onclick={() => (selectedArticle = null)}
      class="fixed inset-0 w-full h-full cursor-default border-0 bg-transparent"
    ></button>

    <div
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      class="relative z-10 bg-[#2A303C] border border-[#384252] rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#E2E8F0] font-sans"
    >
      <!-- Toppheader -->
      <div class="p-4 bg-[#191E24] border-b border-[#384252] flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2">
          <span class="text-xs uppercase font-bold text-[#F471B5] bg-[#F471B5]/15 px-3 py-1 rounded-lg border border-[#F471B5]/30">
            {selectedArticle.tag || "Nyhet"}
          </span>
          {#if selectedArticle.isPinned}
            <span class="text-xs font-bold text-[#F4C152] bg-[#F4C152]/20 px-2.5 py-1 rounded-lg border border-[#F4C152]/40 flex items-center gap-1">
              <Pin class="w-3 h-3 fill-[#F4C152]" />
              <span>Festet</span>
            </span>
          {/if}
        </div>

        <div class="flex items-center gap-2">
          {#if canManageArticle(selectedArticle)}
            <button
              onclick={() => openEditModal(selectedArticle)}
              class="px-3 py-1.5 rounded-xl bg-[#242B35] hover:bg-[#384252] text-white text-xs font-bold border border-[#384252] flex items-center gap-1.5 transition-colors"
            >
              <Edit3 class="w-3.5 h-3.5 text-[#9FE88D]" />
              <span>Rediger</span>
            </button>

            <button
              onclick={() => {
                if (confirm("Er du sikker på at du vil slette denne artikkelen permanent?")) {
                  onDeleteArticle(selectedArticle._id);
                  selectedArticle = null;
                }
              }}
              class="p-2 rounded-xl text-[#FB6F84] hover:bg-[#3b2222] transition-colors"
              title="Slett artikkel"
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

      <!-- Artikkelinnhold -->
      <div class="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 custom-scrollbar">
        <!-- Toppbilde med fokuspunktjustering -->
        {#if selectedArticle.imageUrl}
          <div class={`rounded-2xl overflow-hidden bg-[#191E24] border border-[#384252] shadow-lg relative group ${getCoverHeightClass(selectedArticle.imageHeight)}`}>
            <button
              type="button"
              onclick={() => (zoomedImageUrl = selectedArticle.imageUrl)}
              class="w-full h-full p-0 border-0 bg-transparent block cursor-zoom-in text-left"
              aria-label="Forstørr toppbilde"
            >
              <img
                src={selectedArticle.imageUrl}
                alt={selectedArticle.title}
                style={`object-position: center ${selectedArticle.imagePosition ?? 50}%; object-fit: ${selectedArticle.imageFit || "cover"};`}
                class="w-full h-full"
              />
            </button>
            <button
              type="button"
              onclick={() => (zoomedImageUrl = selectedArticle.imageUrl)}
              class="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-black/70 hover:bg-black text-white text-xs backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
            >
              <Maximize2 class="w-3.5 h-3.5" />
              <span>Forstørr</span>
            </button>
          </div>
        {/if}

        <h1 class="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
          {selectedArticle.title}
        </h1>

        <!-- Forfatter og Dato rad -->
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
            class={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border transition-colors shadow-sm ${
              modalLiked
                ? "bg-[#FB6F84]/20 text-[#FB6F84] border-[#FB6F84]/40 font-bold"
                : "bg-[#242B35] hover:bg-[#384252] text-white border-[#384252]"
            }`}
            title={modalLiked ? "Fjern likerklikk" : "Lik denne artikkelen (1 per bruker)"}
          >
            <Heart class={`w-4 h-4 ${modalLiked ? "fill-[#FB6F84] text-[#FB6F84]" : "text-[#FB6F84]"}`} />
            <span class="font-mono font-bold text-xs">{selectedArticle.likes || 0}</span>
          </button>
        </div>

        {#if selectedArticle.lead}
          <div class="p-4 rounded-xl bg-[#242B35] border-l-4 border-[#F471B5] text-base sm:text-lg font-semibold text-white leading-relaxed italic shadow-sm">
            {selectedArticle.lead}
          </div>
        {/if}

        <!-- Blokker i teksten -->
        <div class="space-y-4 text-[#E2E8F0] leading-relaxed text-sm sm:text-base">
          {#each renderFormattedArticle(selectedArticle.content) as block}
            {#if block.type === "heading"}
              <h2 class="text-xl font-bold text-white pt-3 pb-1 border-b border-[#384252]/60 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-[#F471B5]"></span>
                <span>{block.text}</span>
              </h2>
            {:else if block.type === "quote"}
              <blockquote class="p-4 rounded-xl bg-[#191E24] border-l-4 border-[#F4C152] italic text-[#E2E8F0] font-serif text-base sm:text-lg my-3 shadow-inner">
                "{block.text}"
              </blockquote>
            {:else if block.type === "callout"}
              <div class={`p-4 rounded-xl border flex items-start gap-3 my-3 shadow-sm ${
                block.calloutType === "TIP"
                  ? "bg-[#9FE88D]/10 border-[#9FE88D]/30 text-[#E2E8F0]"
                  : block.calloutType === "WARNING"
                  ? "bg-[#FB6F84]/10 border-[#FB6F84]/30 text-[#E2E8F0]"
                  : "bg-[#70E1F8]/10 border-[#70E1F8]/30 text-[#E2E8F0]"
              }`}>
                <Info class={`w-5 h-5 shrink-0 mt-0.5 ${
                  block.calloutType === "TIP" ? "text-[#9FE88D]" : block.calloutType === "WARNING" ? "text-[#FB6F84]" : "text-[#70E1F8]"
                }`} />
                <div class="text-sm space-y-1">
                  <p class="whitespace-pre-wrap">{block.text}</p>
                </div>
              </div>
            {:else if block.type === "image"}
              <div class={`my-4 ${
                block.align === "left"
                  ? "float-left sm:w-1/2 mr-4 mb-3"
                  : block.align === "right"
                  ? "float-right sm:w-1/2 ml-4 mb-3"
                  : block.align === "center"
                  ? "max-w-md mx-auto"
                  : "w-full"
              }`}>
                <div class="rounded-2xl overflow-hidden bg-[#191E24] border border-[#384252] shadow-md group relative">
                  <button
                    type="button"
                    onclick={() => (zoomedImageUrl = block.src || null)}
                    class="w-full h-auto p-0 border-0 bg-transparent block cursor-zoom-in text-left"
                    aria-label="Forstørr artikkelbilde"
                  >
                    <img
                      src={block.src}
                      alt={block.caption || "Artikkelbilde"}
                      class="w-full h-auto max-h-[480px] object-cover group-hover:scale-102 transition-transform duration-200"
                    />
                  </button>
                  <button
                    type="button"
                    onclick={() => (zoomedImageUrl = block.src || null)}
                    class="absolute bottom-2 right-2 p-1 rounded bg-black/70 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Forstørr bilde"
                  >
                    <Maximize2 class="w-3 h-3" />
                  </button>
                </div>
                {#if block.caption}
                  <p class="text-xs text-[#94A3B8] italic mt-1.5 text-center">
                    📸 {block.caption}
                  </p>
                {/if}
              </div>
            {:else if block.type === "list"}
              <ul class="space-y-1.5 pl-2 my-2">
                {#each block.items || [] as item}
                  <li class="flex items-start gap-2 text-sm">
                    <span class="text-[#F471B5] font-bold">•</span>
                    <span>{item}</span>
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="whitespace-pre-wrap leading-relaxed">{block.text}</p>
            {/if}
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- ============================================================== -->
<!-- MODAL 2: FORSTØRRET BILDEVISNING (LIGHTBOX)                    -->
<!-- ============================================================== -->
{#if zoomedImageUrl}
  <div
    role="presentation"
    onclick={() => (zoomedImageUrl = null)}
    class="fixed inset-0 z-[80] bg-black/95 backdrop-blur-lg flex items-center justify-center p-4 cursor-zoom-out"
  >
    <button
      onclick={() => (zoomedImageUrl = null)}
      class="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
    >
      <X class="w-6 h-6" />
    </button>
    <img
      src={zoomedImageUrl}
      alt="Forstørret bilde"
      class="max-w-[95vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
    />
  </div>
{/if}

<!-- ============================================================== -->
<!-- MODAL 3: REDIGER / PUBLISER ARTIKKEL (STUDIO)                  -->
<!-- ============================================================== -->
{#if isCreateModalOpen}
  <div class="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
    <div class="bg-[#2A303C] border border-[#384252] rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#E2E8F0] font-sans">
      <!-- Toppbar -->
      <div class="p-4 bg-[#191E24] border-b border-[#384252] flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-xl bg-[#F471B5]/20 text-[#F471B5]">
            <Edit3 class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-white">
              {editingArticleId ? "Rediger Artikkel" : "Nyhetsstudio & Runderapport"}
            </h3>
            <p class="text-xs text-[#94A3B8]">Bygg opp en artikkel med tilpasset toppbilde, avsnitt og medier</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Skriv / Forhåndsvisning toggle -->
          <div class="flex items-center gap-1 p-1 bg-[#242B35] rounded-xl border border-[#384252] text-xs">
            <button
              type="button"
              onclick={() => (editorTab = "write")}
              class={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                editorTab === "write" ? "bg-[#F471B5] text-black" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              Rediger
            </button>
            <button
              type="button"
              onclick={() => (editorTab = "preview")}
              class={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1 ${
                editorTab === "preview" ? "bg-[#F471B5] text-black" : "text-[#94A3B8] hover:text-white"
              }`}
            >
              <Eye class="w-3.5 h-3.5" />
              <span>Forhåndsvis</span>
            </button>
          </div>

          <button
            type="button"
            onclick={() => (isCreateModalOpen = false)}
            class="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#242B35]"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Innhold i Studio -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
        {#if editorTab === "write"}
          <div class="space-y-4">
            <!-- Tittel og Kategori -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="sm:col-span-2">
                <label for="art-title" class="block text-xs font-bold text-white mb-1">
                  Artikkeltittel:
                </label>
                <input
                  id="art-title"
                  type="text"
                  bind:value={articleTitle}
                  placeholder="f.eks. Ellevill målfest og overraskende seier for Rom 3!"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-[#191E24] border border-[#384252] text-white focus:border-[#F471B5] focus:outline-none text-sm font-bold placeholder-[#94A3B8]"
                />
              </div>

              <div>
                <label for="art-tag" class="block text-xs font-bold text-white mb-1">
                  Kategori:
                </label>
                <select
                  id="art-tag"
                  bind:value={articleTag}
                  class="w-full px-3.5 py-2.5 rounded-xl bg-[#191E24] border border-[#384252] text-white focus:border-[#F471B5] focus:outline-none text-sm font-semibold"
                >
                  <option value="Runderapport">Runderapport</option>
                  <option value="Taktikk">Taktikk & Overganger</option>
                  <option value="Banter">Banter & Drama</option>
                  <option value="Cup">Cup / Sluttspill</option>
                  <option value="Nyhet">Offisiell Nyhet</option>
                </select>
              </div>
            </div>

            <!-- Ingress -->
            <div>
              <label for="art-lead" class="block text-xs font-bold text-white mb-1">
                Ingress / Sammendrag (Valgfritt):
              </label>
              <textarea
                id="art-lead"
                bind:value={articleLead}
                rows="2"
                placeholder="Kort sammendrag som vises i fet kursiv øverst i artikkelen..."
                class="w-full px-3.5 py-2 rounded-xl bg-[#191E24] border border-[#384252] text-white focus:border-[#F471B5] focus:outline-none text-xs leading-relaxed"
              ></textarea>
            </div>

            <!-- ============================================== -->
            <!-- TOPPBILDE / COVER SECTION MED JUSTERING        -->
            <!-- ============================================== -->
            <div class="p-4 rounded-2xl bg-[#191E24] border border-[#384252] space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <ImageIcon class="w-4 h-4 text-[#F471B5]" />
                  <span class="text-xs font-bold text-white">Toppbilde / Cover Header:</span>
                </div>

                {#if articleCoverUrl}
                  <button
                    type="button"
                    onclick={() => (articleCoverUrl = "")}
                    class="text-xs text-[#FB6F84] hover:underline font-semibold"
                  >
                    Fjern toppbilde
                  </button>
                {/if}
              </div>

              {#if !articleCoverUrl}
                <!-- Opplaster & URL -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="file"
                    accept="image/*"
                    bind:this={coverFileInputRef}
                    onchange={handleCoverImageFile}
                    class="hidden"
                  />
                  <button
                    type="button"
                    onclick={() => coverFileInputRef?.click()}
                    disabled={isUploadingCover}
                    class="p-3 rounded-xl bg-[#242B35] hover:bg-[#2A303C] border border-dashed border-[#384252] hover:border-[#F471B5] text-xs font-bold transition-all flex items-center justify-center gap-2 text-white"
                  >
                    <Upload class={`w-4 h-4 text-[#F471B5] ${isUploadingCover ? "animate-bounce" : ""}`} />
                    <span>{isUploadingCover ? "Laster opp til Convex..." : "Last opp toppbilde fra maskinen"}</span>
                  </button>

                  <input
                    type="text"
                    bind:value={articleCoverUrl}
                    placeholder="Eller lim inn bilde-URL (https://...)"
                    class="px-3 py-2 rounded-xl bg-[#242B35] border border-[#384252] text-xs text-white focus:border-[#F471B5] focus:outline-none"
                  />
                </div>

                <!-- Hurtigvalg / Standardbilder -->
                <div class="space-y-1.5 pt-1">
                  <span class="text-[11px] text-[#94A3B8] font-semibold block">Eller velg et ferdig FPL-toppbilde:</span>
                  <div class="flex items-center flex-wrap gap-1.5">
                    {#each presetCovers as preset}
                      <button
                        type="button"
                        onclick={() => (articleCoverUrl = preset.url)}
                        class="px-2.5 py-1 rounded-lg bg-[#242B35] hover:bg-[#384252] border border-[#384252] hover:border-[#F471B5] text-[11px] font-semibold text-[#E2E8F0] transition-colors flex items-center gap-1.5"
                      >
                        <ImageIcon class="w-3 h-3 text-[#F471B5]" />
                        <span>{preset.name}</span>
                      </button>
                    {/each}
                  </div>
                </div>
              {:else}
                <!-- Justeringskontroller for toppbilde -->
                <div class="space-y-3 pt-1">
                  <!-- Live Forhåndsvisningsramme med justert posisjon -->
                  <div class={`rounded-xl overflow-hidden bg-[#242B35] border border-[#384252] relative group ${getCoverHeightClass(articleImageHeight)}`}>
                    <img
                      src={articleCoverUrl}
                      alt="Toppbilde forhåndsvisning"
                      style={`object-position: center ${articleImagePosition}%; object-fit: ${articleImageFit};`}
                      class="w-full h-full transition-all duration-75"
                    />
                    <div class="absolute top-2 left-2 px-2 py-1 rounded bg-black/70 text-[10px] font-mono text-white backdrop-blur-sm">
                      Fokusposisjon: {articleImagePosition}%
                    </div>
                  </div>

                  <!-- Kontroll-sliders og valg -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 rounded-xl bg-[#242B35] border border-[#384252] text-xs">
                    <!-- Vertikal justering slider -->
                    <div class="space-y-1">
                      <div class="flex items-center justify-between">
                        <span class="font-bold text-[#F471B5] flex items-center gap-1">
                          <Sliders class="w-3.5 h-3.5" />
                          <span>Vertikal justering:</span>
                        </span>
                        <span class="font-mono text-[#94A3B8]">{articleImagePosition}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        bind:value={articleImagePosition}
                        class="w-full accent-[#F471B5] cursor-pointer"
                      />
                      <div class="flex justify-between text-[9px] text-[#94A3B8]">
                        <button type="button" onclick={() => (articleImagePosition = 0)} class="hover:text-white">Topp (0%)</button>
                        <button type="button" onclick={() => (articleImagePosition = 50)} class="hover:text-white">Midten (50%)</button>
                        <button type="button" onclick={() => (articleImagePosition = 100)} class="hover:text-white">Bunn (100%)</button>
                      </div>
                    </div>

                    <!-- Bildehøyde -->
                    <div class="space-y-1">
                      <span class="font-bold text-white block">Visningshøyde:</span>
                      <div class="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onclick={() => (articleImageHeight = "banner")}
                          class={`py-1 px-2 rounded-lg text-[11px] font-bold border transition-colors ${
                            articleImageHeight === "banner" ? "bg-[#F471B5] text-black border-[#F471B5]" : "bg-[#191E24] text-[#94A3B8] border-[#384252]"
                          }`}
                        >
                          Slank (180px)
                        </button>
                        <button
                          type="button"
                          onclick={() => (articleImageHeight = "standard")}
                          class={`py-1 px-2 rounded-lg text-[11px] font-bold border transition-colors ${
                            articleImageHeight === "standard" ? "bg-[#F471B5] text-black border-[#F471B5]" : "bg-[#191E24] text-[#94A3B8] border-[#384252]"
                          }`}
                        >
                          Standard (260px)
                        </button>
                        <button
                          type="button"
                          onclick={() => (articleImageHeight = "large")}
                          class={`py-1 px-2 rounded-lg text-[11px] font-bold border transition-colors ${
                            articleImageHeight === "large" ? "bg-[#F471B5] text-black border-[#F471B5]" : "bg-[#191E24] text-[#94A3B8] border-[#384252]"
                          }`}
                        >
                          Stor (360px)
                        </button>
                        <button
                          type="button"
                          onclick={() => (articleImageHeight = "natural")}
                          class={`py-1 px-2 rounded-lg text-[11px] font-bold border transition-colors ${
                            articleImageHeight === "natural" ? "bg-[#F471B5] text-black border-[#F471B5]" : "bg-[#191E24] text-[#94A3B8] border-[#384252]"
                          }`}
                        >
                          Full / Auto
                        </button>
                      </div>
                    </div>

                    <!-- Tilpasning (Fit) -->
                    <div class="space-y-1 col-span-1 sm:col-span-2 lg:col-span-1">
                      <span class="font-bold text-white block">Tilpasning:</span>
                      <div class="flex gap-1.5">
                        <button
                          type="button"
                          onclick={() => (articleImageFit = "cover")}
                          class={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                            articleImageFit === "cover" ? "bg-[#9FE88D] text-black border-[#9FE88D]" : "bg-[#191E24] text-[#94A3B8] border-[#384252]"
                          }`}
                        >
                          Fyll ut (Cover)
                        </button>
                        <button
                          type="button"
                          onclick={() => (articleImageFit = "contain")}
                          class={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                            articleImageFit === "contain" ? "bg-[#9FE88D] text-black border-[#9FE88D]" : "bg-[#191E24] text-[#94A3B8] border-[#384252]"
                          }`}
                        >
                          Hele bildet (Contain)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              {/if}
            </div>

            <!-- ============================================== -->
            <!-- HOVEDINNHOLD & FORMATERINGSTOOLBAR             -->
            <!-- ============================================== -->
            <div>
              <div class="flex items-center justify-between pb-1.5">
                <label for="art-content" class="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Hovedtekst & Medier:</span>
                  <span class="text-[10px] text-[#94A3B8] font-normal">(Du kan lime inn bilder direkte med Ctrl+V)</span>
                </label>

                <!-- Hurtigknapp for bildeopplasting -->
                <button
                  type="button"
                  onclick={() => (isImageModalOpen = true)}
                  class="px-2.5 py-1 rounded-lg bg-[#F471B5]/20 text-[#F471B5] hover:bg-[#F471B5]/30 text-xs font-bold border border-[#F471B5]/40 flex items-center gap-1.5 transition-colors"
                >
                  <ImageIcon class="w-3.5 h-3.5" />
                  <span>Sett inn bilde / oppsett</span>
                </button>
              </div>

              <!-- Formaterings-verktøylinje -->
              <div class="flex items-center flex-wrap gap-1 p-1.5 bg-[#191E24] border border-[#384252] rounded-t-xl text-xs">
                <button
                  type="button"
                  onclick={() => insertFormat("h2")}
                  class="px-2.5 py-1 rounded hover:bg-[#2A303C] text-[#E2E8F0] flex items-center gap-1 font-bold"
                  title="Sett inn Underoverskrift (H2)"
                >
                  <Heading2 class="w-3.5 h-3.5 text-[#F471B5]" />
                  <span>H2</span>
                </button>

                <button
                  type="button"
                  onclick={() => insertFormat("bold")}
                  class="px-2 py-1 rounded hover:bg-[#2A303C] text-[#E2E8F0] font-bold"
                  title="Fet tekst"
                >
                  <Bold class="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onclick={() => insertFormat("italic")}
                  class="px-2 py-1 rounded hover:bg-[#2A303C] text-[#E2E8F0] italic"
                  title="Kursiv tekst"
                >
                  <Italic class="w-3.5 h-3.5" />
                </button>

                <div class="h-4 w-px bg-[#384252] mx-1"></div>

                <button
                  type="button"
                  onclick={() => insertFormat("quote")}
                  class="px-2.5 py-1 rounded hover:bg-[#2A303C] text-[#E2E8F0] flex items-center gap-1"
                  title="Sitatboks"
                >
                  <Quote class="w-3.5 h-3.5 text-[#F4C152]" />
                  <span>Sitat</span>
                </button>

                <button
                  type="button"
                  onclick={() => insertFormat("list")}
                  class="px-2.5 py-1 rounded hover:bg-[#2A303C] text-[#E2E8F0] flex items-center gap-1"
                  title="Punktliste"
                >
                  <List class="w-3.5 h-3.5 text-[#70E1F8]" />
                  <span>Liste</span>
                </button>

                <button
                  type="button"
                  onclick={() => insertFormat("callout")}
                  class="px-2.5 py-1 rounded hover:bg-[#2A303C] text-[#E2E8F0] flex items-center gap-1"
                  title="Uthevet Infoboks"
                >
                  <Info class="w-3.5 h-3.5 text-[#9FE88D]" />
                  <span>Infoboks</span>
                </button>

                <button
                  type="button"
                  onclick={() => insertFormat("matchbox")}
                  class="px-2.5 py-1 rounded hover:bg-[#2A303C] text-[#E2E8F0] flex items-center gap-1"
                  title="Ukens Kampboks"
                >
                  <Flame class="w-3.5 h-3.5 text-[#FB6F84]" />
                  <span>Kampboks</span>
                </button>
              </div>

              <!-- Tekstområde med utklippstavle-opplasting -->
              <textarea
                id="art-content"
                bind:this={textareaRef}
                bind:value={articleContent}
                onpaste={handleTextareaPaste}
                rows="10"
                placeholder="Skriv artikkelen din her... Du kan sette inn bilder hvor du vil, bruke avsnitt, lister og sitater."
                class="w-full p-4 rounded-b-xl bg-[#191E24] border-x border-b border-[#384252] text-white focus:border-[#F471B5] focus:outline-none text-sm font-sans leading-relaxed custom-scrollbar font-mono"
              ></textarea>
            </div>
          </div>
        {:else}
          <!-- FORHÅNDSVISNINGSFANE -->
          <div class="space-y-5 bg-[#191E24] p-6 rounded-2xl border border-[#384252]">
            {#if articleCoverUrl}
              <div class={`rounded-xl overflow-hidden bg-[#242B35] border border-[#384252] ${getCoverHeightClass(articleImageHeight)}`}>
                <img
                  src={articleCoverUrl}
                  alt={articleTitle}
                  style={`object-position: center ${articleImagePosition}%; object-fit: ${articleImageFit};`}
                  class="w-full h-full"
                />
              </div>
            {/if}

            <h1 class="text-2xl sm:text-3xl font-black text-white leading-tight">
              {articleTitle || "Forhåndsvisningstittel"}
            </h1>

            {#if articleLead}
              <div class="p-3.5 rounded-xl bg-[#242B35] border-l-4 border-[#F471B5] text-base font-semibold text-white italic">
                {articleLead}
              </div>
            {/if}

            <div class="space-y-4 text-sm leading-relaxed">
              {#each renderFormattedArticle(articleContent) as block}
                {#if block.type === "heading"}
                  <h2 class="text-lg font-bold text-white pt-2 border-b border-[#384252]/60">{block.text}</h2>
                {:else if block.type === "quote"}
                  <blockquote class="p-3.5 rounded-xl bg-[#242B35] border-l-4 border-[#F4C152] italic font-serif">"{block.text}"</blockquote>
                {:else if block.type === "callout"}
                  <div class="p-3.5 rounded-xl bg-[#70E1F8]/10 border border-[#70E1F8]/30 flex items-start gap-2.5 text-xs">
                    <Info class="w-4 h-4 text-[#70E1F8] shrink-0 mt-0.5" />
                    <span>{block.text}</span>
                  </div>
                {:else if block.type === "image"}
                  <div class={`my-3 ${block.align === "left" ? "float-left w-1/2 mr-3" : block.align === "right" ? "float-right w-1/2 ml-3" : "w-full"}`}>
                    <img src={block.src} alt={block.caption || ""} class="rounded-xl border border-[#384252] max-h-72 w-full object-cover" />
                    {#if block.caption}
                      <p class="text-xs text-[#94A3B8] italic mt-1 text-center">📸 {block.caption}</p>
                    {/if}
                  </div>
                {:else if block.type === "list"}
                  <ul class="space-y-1 pl-2">
                    {#each block.items || [] as item}
                      <li class="flex items-start gap-2 text-xs">
                        <span class="text-[#F471B5]">•</span>
                        <span>{item}</span>
                      </li>
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

      <!-- Bunnknapper -->
      <div class="p-4 bg-[#191E24] border-t border-[#384252] flex items-center justify-end gap-3 shrink-0">
        <button
          type="button"
          onclick={() => (isCreateModalOpen = false)}
          class="px-4 py-2 rounded-xl bg-[#242B35] hover:bg-[#384252] text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors"
        >
          Avbryt
        </button>

        <button
          type="button"
          onclick={handleSaveArticle}
          disabled={isSubmitting}
          class="px-5 py-2.5 rounded-xl bg-[#9FE88D] hover:bg-[#8fd97e] text-[#16380c] font-bold text-xs transition-all shadow-md flex items-center gap-1.5"
        >
          <Check class="w-4 h-4" />
          <span>{isSubmitting ? "Lagrer..." : editingArticleId ? "Lagre Endringer" : "Publiser Artikkel"}</span>
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ============================================================== -->
<!-- MODAL 4: SETT INN INLINE BILDE (MED OPPLASTING & JUSTERING)    -->
<!-- ============================================================== -->
{#if isImageModalOpen}
  <div class="fixed inset-0 bg-black/90 backdrop-blur-md z-[70] flex items-center justify-center p-4">
    <div class="bg-[#2A303C] border border-[#384252] rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-[#E2E8F0] font-sans">
      <div class="flex items-center justify-between pb-2 border-b border-[#384252]">
        <div class="flex items-center gap-2">
          <ImageIcon class="w-5 h-5 text-[#F471B5]" />
          <h4 class="font-bold text-white text-sm sm:text-base">Sett inn bilde i artikkelen</h4>
        </div>
        <button
          type="button"
          onclick={() => (isImageModalOpen = false)}
          class="text-[#94A3B8] hover:text-white"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Opplastingsvalg -->
      <div class="space-y-3 text-xs">
        <div>
          <span class="block font-bold text-white mb-1.5">Last opp bildefil:</span>
          <input
            type="file"
            accept="image/*"
            bind:this={inlineFileInputRef}
            onchange={async (e) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (f) {
                const u = await handleInlineImageFile(f);
                if (u) inlineImageUrl = u;
              }
            }}
            class="hidden"
          />

          <div
            role="button"
            tabindex="0"
            onpaste={handleModalPaste}
            onclick={() => inlineFileInputRef?.click()}
            onkeydown={(e) => (e.key === "Enter" || e.key === " ") && inlineFileInputRef?.click()}
            class="p-4 rounded-xl border-2 border-dashed border-[#384252] hover:border-[#F471B5] text-center bg-[#191E24] cursor-pointer transition-colors space-y-1.5"
          >
            {#if isUploadingInline}
              <Upload class="w-6 h-6 text-[#F471B5] mx-auto animate-bounce" />
              <p class="font-bold text-white">Laster opp til Convex...</p>
            {:else if inlineImageUrl}
              <img src={inlineImageUrl} alt="Forhåndsvisning" class="max-h-36 mx-auto rounded-lg object-contain border border-[#384252]" />
              <p class="text-[11px] text-[#9FE88D] font-semibold">✓ Bilde lastet opp og klart</p>
            {:else}
              <Upload class="w-6 h-6 text-[#94A3B8] mx-auto" />
              <p class="font-bold text-white">Klikk for å velge fil, eller lim inn bilde (Ctrl+V)</p>
              <p class="text-[11px] text-[#94A3B8]">PNG, JPG, SVG eller WebP (maks 10 MB)</p>
            {/if}
          </div>
        </div>

        <div>
          <label for="img-url-in" class="block font-bold text-white mb-1">Eller oppgi direkte bilde-URL:</label>
          <input
            id="img-url-in"
            type="text"
            bind:value={inlineImageUrl}
            placeholder="https://images.unsplash.com/..."
            class="w-full px-3 py-2 rounded-xl bg-[#191E24] border border-[#384252] text-white focus:border-[#F471B5] focus:outline-none"
          />
        </div>

        <div>
          <label for="img-caption-in" class="block font-bold text-white mb-1">Bildetekst / Caption (valgfritt):</label>
          <input
            id="img-caption-in"
            type="text"
            bind:value={inlineImageCaption}
            placeholder="f.eks. Jublende managere etter scoring på overtid..."
            class="w-full px-3 py-2 rounded-xl bg-[#191E24] border border-[#384252] text-white focus:border-[#F471B5] focus:outline-none"
          />
        </div>

        <!-- Justering i teksten -->
        <div>
          <span class="block font-bold text-white mb-1">Justering og tekstflyt:</span>
          <div class="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onclick={() => (inlineImageAlign = "full")}
              class={`py-2 rounded-xl border text-[11px] font-bold transition-all flex flex-col items-center gap-1 ${
                inlineImageAlign === "full" ? "bg-[#F471B5] text-black border-[#F471B5]" : "bg-[#191E24] text-[#94A3B8] border-[#384252]"
              }`}
            >
              <Maximize2 class="w-3.5 h-3.5" />
              <span>Full bredde</span>
            </button>
            <button
              type="button"
              onclick={() => (inlineImageAlign = "left")}
              class={`py-2 rounded-xl border text-[11px] font-bold transition-all flex flex-col items-center gap-1 ${
                inlineImageAlign === "left" ? "bg-[#F471B5] text-black border-[#F471B5]" : "bg-[#191E24] text-[#94A3B8] border-[#384252]"
              }`}
            >
              <AlignLeft class="w-3.5 h-3.5" />
              <span>Venstrestilt</span>
            </button>
            <button
              type="button"
              onclick={() => (inlineImageAlign = "right")}
              class={`py-2 rounded-xl border text-[11px] font-bold transition-all flex flex-col items-center gap-1 ${
                inlineImageAlign === "right" ? "bg-[#F471B5] text-black border-[#F471B5]" : "bg-[#191E24] text-[#94A3B8] border-[#384252]"
              }`}
            >
              <AlignRight class="w-3.5 h-3.5" />
              <span>Høyrestilt</span>
            </button>
            <button
              type="button"
              onclick={() => (inlineImageAlign = "center")}
              class={`py-2 rounded-xl border text-[11px] font-bold transition-all flex flex-col items-center gap-1 ${
                inlineImageAlign === "center" ? "bg-[#F471B5] text-black border-[#F471B5]" : "bg-[#191E24] text-[#94A3B8] border-[#384252]"
              }`}
            >
              <AlignCenter class="w-3.5 h-3.5" />
              <span>Sentrert</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Knapper -->
      <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-[#384252]">
        <button
          type="button"
          onclick={() => (isImageModalOpen = false)}
          class="px-4 py-2 rounded-xl bg-[#242B35] text-[#94A3B8] hover:text-white text-xs border border-[#384252]"
        >
          Avbryt
        </button>

        <button
          type="button"
          onclick={insertInlineImage}
          disabled={!inlineImageUrl}
          class="px-5 py-2 rounded-xl bg-[#9FE88D] hover:bg-[#8fd97e] text-[#16380c] font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-50"
        >
          <Check class="w-4 h-4" />
          <span>Sett inn i teksten</span>
        </button>
      </div>
    </div>
  </div>
{/if}
