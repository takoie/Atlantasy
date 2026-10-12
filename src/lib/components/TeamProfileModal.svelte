<script lang="ts">
  import {
    X,
    ExternalLink,
    Trophy,
    TrendingUp,
    Shirt,
    Sparkles,
    Crown,
    Medal,
    Edit3,
    Upload,
    Check,
    AlertCircle,
  } from "lucide-svelte";
  import { useQuery, useMutation, useAction } from "$lib/convex.svelte";
  import { api } from "../../../convex/_generated/api";
  import { openExternalUrl } from "$lib/utils/openUrl";

  interface PitchPlayer {
    id?: number;
    name: string;
    pos: "GKP" | "DEF" | "MID" | "FWD";
    points: number;
    isCaptain?: boolean;
    isViceCaptain?: boolean;
    club?: string;
    crest?: string;
    opponent?: string;
  }

  interface HistoryEntry {
    gw: number;
    points: number;
    rank?: number;
    netPoints?: number;
    average?: number;
    leagueRank?: number | null;
  }

  interface ChipEntry {
    name: string;
    status: string;
    gw: number | null | string;
  }

  interface TeamProfileData {
    entryId: number;
    managerName: string;
    teamName: string;
    leagueRank: number;
    totalManagers: number;
    totalPoints: number;
    currentGwPoints: number;
    currentGwTransfersCost: number;
    roomName?: string;
    roomColor?: string;
    roomNumber?: number;
    overallFplRank?: number | null;
    teamValue: string;
    bank?: string;
    totalTransfers: number;
    pitch?: PitchPlayer[];
    bench?: PitchPlayer[];
    history?: HistoryEntry[];
    chips?: ChipEntry[];
    activeChip?: string | null;
    eventTransfersCost?: number;
    pointsOnBench?: number;
    cupTrophies?: Array<{
      place: 1 | 2 | 3;
      title: string;
      cupName: string;
      season?: string;
      format?: string;
      date?: number;
      type: "cup";
    }>;
    monthlyTrophies?: Array<{
      place: 1 | 2 | 3;
      title: string;
      category: "individual" | "room";
      monthName: string;
      score: number;
      date?: number;
    }>;
    user?: {
      _id: string;
      username: string;
      avatar?: string;
      role?: string;
    } | null;
    fplUrl?: string;
  }

  let {
    entryId = null,
    isOpen = false,
    currentUser = null,
    onClose = () => {},
  }: {
    entryId: number | null;
    isOpen: boolean;
    currentUser?: any;
    onClose: () => void;
  } = $props();

  const profileQuery = useQuery(
    api.rooms.getTeamProfile,
    () => (entryId ? { entryId } : undefined)
  );
  const fetchLiveSquadAction = useAction(api.fpl.fetchLiveTeamSquad);

  const updateUserProfileMutation = useMutation(api.auth.updateUserProfile);
  const generateUploadUrlMutation = useMutation(api.auth.generateAvatarUploadUrl);
  const saveUploadedAvatarMutation = useMutation(api.auth.saveUploadedAvatar);

  let liveSquad = $state<Partial<TeamProfileData> | null>(null);
  let profile = $derived(
    (profileQuery.data as TeamProfileData | undefined)
      ? {
          ...(profileQuery.data as TeamProfileData),
          ...(liveSquad ?? {}),
        }
      : null
  );
  let activeTab = $state<"pitch" | "trophies" | "stats" | "chips">("pitch");

  $effect(() => {
    if (!isOpen || !entryId) {
      liveSquad = null;
      return;
    }

    let cancelled = false;
    fetchLiveSquadAction
      .execute({ entryId })
      .then((result: any) => {
        if (!cancelled && result?.success) {
          liveSquad = {
            pitch: result.pitch ?? [],
            bench: result.bench ?? [],
            // history kommer fra getTeamProfile (liga-relativ rank), ikke fra live-action.
            chips: result.chips ?? [],
            activeChip: result.activeChip,
            eventTransfersCost: result.eventTransfersCost,
            pointsOnBench: result.pointsOnBench,
          };
        }
      })
      .catch(() => {
        if (!cancelled) liveSquad = null;
      });

    return () => {
      cancelled = true;
    };
  });

  // Redigeringsstate
  let isEditingProfile = $state(false);
  let editUsername = $state("");
  let editAvatar = $state("");
  let isSavingProfile = $state(false);
  let isUploadingImage = $state(false);
  let editErrorMessage = $state("");
  let editSuccessMessage = $state("");
  let fileInputRef = $state<HTMLInputElement | null>(null);

  // Premier League Logo Presets (2026/2027-sesongens 20 lag)
  const plClubPresets = [
    { name: "Arsenal", url: "https://resources.premierleague.com/premierleague/badges/70/t3.png" },
    { name: "Aston Villa", url: "https://resources.premierleague.com/premierleague/badges/70/t7.png" },
    { name: "Bournemouth", url: "https://resources.premierleague.com/premierleague/badges/70/t91.png" },
    { name: "Brentford", url: "https://resources.premierleague.com/premierleague/badges/70/t94.png" },
    { name: "Brighton & Hove Albion", url: "https://resources.premierleague.com/premierleague/badges/70/t36.png" },
    { name: "Chelsea", url: "https://resources.premierleague.com/premierleague/badges/70/t8.png" },
    { name: "Coventry City", url: "https://resources.premierleague.com/premierleague/badges/70/t59.png" },
    { name: "Crystal Palace", url: "https://resources.premierleague.com/premierleague/badges/70/t31.png" },
    { name: "Everton", url: "https://resources.premierleague.com/premierleague/badges/70/t11.png" },
    { name: "Fulham", url: "https://resources.premierleague.com/premierleague/badges/70/t54.png" },
    { name: "Hull City", url: "https://resources.premierleague.com/premierleague/badges/70/t88.png" },
    { name: "Ipswich Town", url: "https://resources.premierleague.com/premierleague/badges/70/t40.png" },
    { name: "Leeds United", url: "https://resources.premierleague.com/premierleague/badges/70/t2.png" },
    { name: "Liverpool", url: "https://resources.premierleague.com/premierleague/badges/70/t14.png" },
    { name: "Manchester City", url: "https://resources.premierleague.com/premierleague/badges/70/t43.png" },
    { name: "Manchester United", url: "https://resources.premierleague.com/premierleague/badges/70/t1.png" },
    { name: "Newcastle United", url: "https://resources.premierleague.com/premierleague/badges/70/t4.png" },
    { name: "Nottingham Forest", url: "https://resources.premierleague.com/premierleague/badges/70/t17.png" },
    { name: "Sunderland", url: "https://resources.premierleague.com/premierleague/badges/70/t56.png" },
    { name: "Tottenham Hotspur", url: "https://resources.premierleague.com/premierleague/badges/70/t6.png" },
  ];

  // Fotball & Sport Avatar Presets
  const footballIconPresets = [
    { name: "Mester", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Champion" },
    { name: "Captain", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Captain" },
    { name: "Keeper", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Goalkeeper" },
    { name: "Taktiker", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Tactician" },
    { name: "Dommer", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Referee" },
    { name: "Gullsko", url: "https://api.dicebear.com/7.x/identicon/svg?seed=GoldenBoot" },
  ];

  // Sjekk om innlogget bruker kan redigere denne profilen (eier eller admin)
  let isOwnerOrAdmin = $derived(
    currentUser &&
      (currentUser.fplEntryId === entryId ||
        currentUser.role === "admin" ||
        (profile?.user && profile.user._id === currentUser._id))
  );

  // Åpne redigering
  function startEditing() {
    if (!profile) return;
    editUsername = profile.user?.username || profile.managerName || "";
    editAvatar = profile.user?.avatar || "";
    editErrorMessage = "";
    editSuccessMessage = "";
    isEditingProfile = true;
  }

  import { formatConvexError } from "$lib/utils/formatError";

  // Lagre profilendring (Brukernavn / Forhåndsdefinert avatar)
  async function handleSaveProfile() {
    if (!profile?.user?._id) return;
    if (!editUsername.trim()) {
      editErrorMessage = "Visningsnavn kan ikke være tomt.";
      return;
    }

    isSavingProfile = true;
    editErrorMessage = "";
    editSuccessMessage = "";

    try {
      await updateUserProfileMutation.mutate({
        userId: profile.user._id as any,
        username: editUsername.trim(),
        avatar: editAvatar || undefined,
      });

      editSuccessMessage = "Profil oppdatert!";
      setTimeout(() => {
        isEditingProfile = false;
        editSuccessMessage = "";
      }, 1200);
    } catch (err: any) {
      editErrorMessage = formatConvexError(err, "Kunne ikke oppdatere profil.");
    } finally {
      isSavingProfile = false;
    }
  }

  // Last opp egendefinert bilde direkte til Convex Storage
  async function handleImageUpload(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file || !profile?.user?._id) return;

    if (file.size > 5 * 1024 * 1024) {
      editErrorMessage = "Bildet er for stort. Maks filstørrelse er 5 MB.";
      return;
    }

    isUploadingImage = true;
    editErrorMessage = "";

    try {
      // 1. Hent sikker upload-URL fra Convex
      const postUrl = await generateUploadUrlMutation.mutate({});

      // 2. Last opp binærfilen til Convex Storage
      const res = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await res.json();

      // 3. Lagre storageId på brukeren
      const avatarUrl = await saveUploadedAvatarMutation.mutate({
        userId: profile.user._id as any,
        storageId,
      });

      if (avatarUrl) {
        editAvatar = avatarUrl;
        editSuccessMessage = "Bilde lastet opp til Convex og satt som avatar!";
        setTimeout(() => {
          editSuccessMessage = "";
        }, 3000);
      }
    } catch (err: any) {
      editErrorMessage = formatConvexError(err, "Kunne ikke laste opp bilde.");
    } finally {
      isUploadingImage = false;
    }
  }

  // Effektive $derived-oppdelinger for fotballbanen
  let goalkeepers = $derived(profile?.pitch?.filter((p) => p.pos === "GKP") ?? []);
  let defenders = $derived(profile?.pitch?.filter((p) => p.pos === "DEF") ?? []);
  let midfielders = $derived(profile?.pitch?.filter((p) => p.pos === "MID") ?? []);
  let forwards = $derived(profile?.pitch?.filter((p) => p.pos === "FWD") ?? []);
  let benchPlayers = $derived(profile?.bench ?? []);

  // Dynamisk beregning av maks poeng for proporsjonale søyler i grafen
  let maxHistoryPoints = $derived(
    Math.max(...(profile?.history?.map((h) => h.points) ?? [100]), 60)
  );

  // Klatregraf: kun runder som har en liga-plassering
  let rankPoints = $derived(
    (profile?.history ?? []).filter(
      (h): h is HistoryEntry & { leagueRank: number } =>
        typeof h.leagueRank === "number"
    )
  );
  let leagueSize = $derived(
    (profile as unknown as { leagueSize?: number })?.leagueSize ?? 20
  );

  let totalTrophiesCount = $derived(
    (profile?.cupTrophies?.length || 0) + (profile?.monthlyTrophies?.length || 0)
  );

  let goldCount = $derived(
    (profile?.cupTrophies?.filter((t) => t.place === 1).length || 0) +
    (profile?.monthlyTrophies?.filter((t) => t.place === 1).length || 0)
  );

  let silverCount = $derived(
    (profile?.cupTrophies?.filter((t) => t.place === 2).length || 0) +
    (profile?.monthlyTrophies?.filter((t) => t.place === 2).length || 0)
  );

  let bronzeCount = $derived(
    (profile?.cupTrophies?.filter((t) => t.place === 3).length || 0) +
    (profile?.monthlyTrophies?.filter((t) => t.place === 3).length || 0)
  );

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && isOpen) {
      if (isEditingProfile) {
        isEditingProfile = false;
      } else {
        onClose();
      }
    }
  }

  function openExternalFpl(url?: string) {
    if (!url) return;
    openExternalUrl(url);
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && entryId}
  <!-- Backdrop -->
  <div class="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
    <button
      type="button"
      aria-label="Lukk modal"
      onclick={onClose}
      class="fixed inset-0 w-full h-full cursor-default border-0 bg-transparent"
    ></button>

    <!-- Modal Container -->
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-manager-title"
      tabindex="-1"
      class="relative z-10 bg-white/[0.055] backdrop-blur-sm border border-white/10 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-[#E2E8F0] font-sans"
    >
      <!-- Toppheader med avatar, managerinfo, rom og redigeringsknapp -->
      <div class="p-4 sm:p-5 bg-black/20 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div class="flex items-center gap-3.5 min-w-0">
          <!-- Avatar med bilde / preset -->
          <div class="relative group shrink-0">
            {#if profile?.user?.avatar}
              <img
                src={profile.user.avatar}
                alt="Avatar"
                class="w-12 h-12 rounded-2xl border-2 border-white/10 object-contain bg-black/20 p-1 shadow-md"
              />
            {:else}
              <div
                class="w-12 h-12 rounded-2xl bg-[#9FE88D] text-[#16380c] flex items-center justify-center font-black text-xl shadow-md shrink-0"
              >
                <Shirt class="w-6 h-6 text-[#16380c]" />
              </div>
            {/if}

            {#if isOwnerOrAdmin}
              <button
                type="button"
                onclick={startEditing}
                title="Endre avatar og visningsnavn"
                class="absolute -bottom-1 -right-1 p-1 rounded-lg bg-white/[0.055] backdrop-blur-sm text-[#F4C152] border border-white/10 hover:bg-white/10 transition-colors shadow-sm"
              >
                <Edit3 class="w-3 h-3" />
              </button>
            {/if}
          </div>

          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h2 id="modal-manager-title" class="text-base sm:text-lg font-bold text-white truncate">
                {profile?.user?.username || profile?.managerName || "Laster manager..."}
              </h2>
              {#if profile?.roomName}
                <span
                  class="text-[11px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border"
                  style={`border-color: ${profile.roomColor || "#9FE88D"}50; color: ${profile.roomColor || "#9FE88D"}; background-color: ${profile.roomColor || "#9FE88D"}15;`}
                >
                  {profile.roomName}
                </span>
              {/if}

              {#if totalTrophiesCount > 0}
                <button
                  type="button"
                  onclick={() => (activeTab = "trophies")}
                  title={`Trofeer: ${goldCount}x Gull 🥇, ${silverCount}x Sølv 🥈, ${bronzeCount}x Bronse 🥉 (Klikk for å se troférom)`}
                  class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#F4C152]/15 text-[#F4C152] border border-[#F4C152]/30 flex items-center gap-1.5 hover:bg-[#F4C152]/25 transition-all shadow-sm"
                >
                  <Trophy class="w-3 h-3 text-[#F4C152]" />
                  <span>{totalTrophiesCount} {totalTrophiesCount === 1 ? "Pokal" : "Pokaler"}</span>
                  {#if goldCount > 0}<span>🥇{goldCount}</span>{/if}
                  {#if silverCount > 0}<span>🥈{silverCount}</span>{/if}
                  {#if bronzeCount > 0}<span>🥉{bronzeCount}</span>{/if}
                </button>
              {/if}
            </div>

            <p class="text-xs text-[#AEB9CC] truncate mt-0.5 flex items-center gap-2">
              <span>{profile?.teamName || "FPL-lag"}</span>
              <span>•</span>
              <span class="font-mono">ID: #{entryId}</span>
              {#if isOwnerOrAdmin}
                <button
                  type="button"
                  onclick={startEditing}
                  class="text-[11px] text-[#9FE88D] hover:underline font-semibold flex items-center gap-1"
                >
                  <Edit3 class="w-3 h-3" />
                  <span>Rediger profil</span>
                </button>
              {/if}
            </p>
          </div>
        </div>

        <!-- Handlinger og ekstern FPL-lenke -->
        <div class="flex items-center gap-2">
          {#if profile?.fplUrl}
            <button
              type="button"
              onclick={() => openExternalFpl(profile?.fplUrl)}
              class="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/10 text-[#E2E8F0] border border-white/10 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
              title="Åpne offisiell FPL-lagside i ekstern nettleser"
            >
              <span>Åpne i FPL</span>
              <ExternalLink class="w-3.5 h-3.5 text-[#9FE88D]" />
            </button>
          {/if}

          <button
            type="button"
            onclick={onClose}
            aria-label="Lukk modal"
            class="p-1.5 rounded-xl text-[#AEB9CC] hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Hurtigtall / Nøkkeltall Stripe -->
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 p-3 bg-black/20 border-b border-white/10 text-xs shrink-0 font-mono">
        <div class="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
          <span class="text-[10px] text-[#AEB9CC] uppercase font-sans block">Ligaplassering</span>
          <div class="text-base font-bold text-[#F4C152] flex items-center gap-1">
            <Trophy class="w-4 h-4" />
            <span>#{profile?.leagueRank ?? "--"}</span>
            {#if profile?.totalManagers}
              <span class="text-[10px] text-[#AEB9CC] font-normal font-sans">av {profile.totalManagers}</span>
            {/if}
          </div>
        </div>

        <div class="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
          <span class="text-[10px] text-[#AEB9CC] uppercase font-sans block">Totalt i sesongen</span>
          <span class="text-base font-bold text-[#9FE88D]">
            {profile?.totalPoints ?? 0} <span class="text-[10px] text-[#AEB9CC] font-normal">pts</span>
          </span>
        </div>

        <div class="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
          <span class="text-[10px] text-[#AEB9CC] uppercase font-sans block">Rundepoeng (live)</span>
          <span class="text-base font-bold text-white">
            {profile?.currentGwPoints ?? 0} <span class="text-[10px] text-[#AEB9CC] font-normal">pts</span>
            {#if profile && profile.currentGwTransfersCost > 0}
              <span class="text-[10px] text-[#FB6F84]">(-{profile.currentGwTransfersCost})</span>
            {/if}
          </span>
        </div>

        <div class="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
          <span class="text-[10px] text-[#AEB9CC] uppercase font-sans block">Meritter og trofeer</span>
          <span class="text-base font-bold text-[#F4C152] flex items-center gap-1">
            <Crown class="w-4 h-4 text-[#F4C152]" />
            <span>{totalTrophiesCount}</span>
          </span>
        </div>

        <div class="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 col-span-2 sm:col-span-1">
          <span class="text-[10px] text-[#AEB9CC] uppercase font-sans block">Lagverdi</span>
          <span class="text-sm font-bold text-[#9FE88D]">
            {profile?.teamValue || "£100.0m"}
          </span>
        </div>
      </div>

      <!-- Fanemeny -->
      <div class="flex items-center gap-2 px-4 pt-3 border-b border-white/10 bg-black/20 shrink-0">
        <button
          type="button"
          onclick={() => (activeTab = "pitch")}
          class={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "pitch"
              ? "border-[#9FE88D] text-[#9FE88D]"
              : "border-transparent text-[#AEB9CC] hover:text-white"
          }`}
        >
          <Shirt class="w-3.5 h-3.5" />
          <span>Lineup</span>
        </button>

        <button
          type="button"
          onclick={() => (activeTab = "trophies")}
          class={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "trophies"
              ? "border-[#F4C152] text-[#F4C152]"
              : "border-transparent text-[#AEB9CC] hover:text-[#F4C152]"
          }`}
        >
          <Trophy class="w-3.5 h-3.5 text-[#F4C152]" />
          <span>Trofeer og pokaler ({totalTrophiesCount})</span>
        </button>

        <button
          type="button"
          onclick={() => (activeTab = "stats")}
          class={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "stats"
              ? "border-[#9FE88D] text-[#9FE88D]"
              : "border-transparent text-[#AEB9CC] hover:text-white"
          }`}
        >
          <TrendingUp class="w-3.5 h-3.5" />
          <span>Klatregraf og historikk</span>
        </button>

        <button
          type="button"
          onclick={() => (activeTab = "chips")}
          class={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "chips"
              ? "border-[#9FE88D] text-[#9FE88D]"
              : "border-transparent text-[#AEB9CC] hover:text-white"
          }`}
        >
          <Sparkles class="w-3.5 h-3.5" />
          <span>Chips</span>
        </button>
      </div>

      <!-- Faner Innhold -->
      <div class="p-4 sm:p-5 overflow-y-auto flex-1 custom-scrollbar">
        <!-- FANE 1: LAGOLLSTILLING -->
        {#if activeTab === "pitch"}
          <div class="space-y-4">
            {#snippet playerChip(p: any, bg: string, fg: string)}
              <div class="flex flex-col items-center min-w-0 w-full px-0.5">
                <div
                  class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-black flex items-center justify-center text-[11px] shadow-md border-2 border-white/25 overflow-hidden"
                  style={`background-color:${bg};color:${fg}`}
                >
                  {#if p.crest}
                    <img
                      src={p.crest}
                      alt={p.club ?? ""}
                      class="w-6 h-6 sm:w-7 sm:h-7 object-contain drop-shadow"
                      loading="lazy"
                      onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                    />
                  {:else}
                    {p.name.slice(0, 3).toUpperCase()}
                  {/if}
                </div>
                <span class="mt-1 text-[10px] sm:text-[11px] font-bold text-white bg-black/55 px-1.5 py-0.5 rounded-full backdrop-blur-sm truncate max-w-full">
                  {p.name}
                </span>
                {#if p.opponent}
                  <span class="mt-0.5 text-[9px] font-mono font-semibold text-white/85 bg-black/45 px-1 rounded truncate max-w-full">
                    {p.opponent}
                  </span>
                {/if}
                <span class="mt-0.5 text-[10px] font-mono font-bold text-[#9FE88D] bg-black/70 px-1.5 rounded">
                  {p.points} pts
                </span>
              </div>
            {/snippet}

            <div
              class="relative overflow-hidden rounded-2xl border border-white/10 shadow-inner p-3 sm:p-5"
              style="background-color:#2f8a43;background-image:repeating-linear-gradient(180deg,rgba(255,255,255,0.055) 0px,rgba(255,255,255,0.055) 30px,transparent 30px,transparent 60px);"
            >
              <!-- Banemarkering (FPL-stil) -->
              <svg
                class="pointer-events-none absolute inset-0 h-full w-full"
                viewBox="0 0 100 130"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <g fill="none" stroke="#ffffff" stroke-opacity="0.4" stroke-width="0.5">
                  <rect x="2" y="2" width="96" height="126" />
                  <line x1="2" y1="65" x2="98" y2="65" />
                  <circle cx="50" cy="65" r="11" />
                  <rect x="26" y="2" width="48" height="16" />
                  <rect x="40" y="2" width="20" height="6" />
                  <rect x="26" y="112" width="48" height="16" />
                  <rect x="40" y="122" width="20" height="6" />
                </g>
                <circle cx="50" cy="65" r="0.9" fill="#ffffff" fill-opacity="0.5" />
              </svg>

              <div class="relative z-10 flex flex-col gap-4 sm:gap-6">
                <!-- Keeper -->
                <div class="grid grid-flow-col auto-cols-fr place-items-center gap-1">
                  {#each goalkeepers as p}
                    {@render playerChip(p, "#F4C152", "#16380c")}
                  {:else}
                    <p class="col-span-full text-xs text-white/70 italic">Ingen spillere i lineupen</p>
                  {/each}
                </div>

                <!-- Forsvar -->
                <div class="grid grid-flow-col auto-cols-fr place-items-center gap-1">
                  {#each defenders as p}
                    {@render playerChip(p, "#38bdf8", "#082f49")}
                  {/each}
                </div>

                <!-- Midtbane -->
                <div class="grid grid-flow-col auto-cols-fr place-items-center gap-1">
                  {#each midfielders as p}
                    {@render playerChip(p, "#9FE88D", "#14532d")}
                  {/each}
                </div>

                <!-- Angrep -->
                <div class="grid grid-flow-col auto-cols-fr place-items-center gap-1">
                  {#each forwards as p}
                    {@render playerChip(p, "#FB6F84", "#4c0519")}
                  {/each}
                </div>
              </div>
            </div>

            <!-- Benk -->
            <div class="p-3.5 rounded-2xl bg-black/20 border border-white/10 space-y-2">
              <span class="text-xs font-bold text-[#AEB9CC] uppercase tracking-wider block">Substitutes / Benk</span>
              <div class="flex items-center justify-around flex-wrap gap-2">
                {#each benchPlayers as p, i}
                  <div class="flex flex-col items-center text-center">
                    <span class="text-[9px] text-[#AEB9CC] font-bold">{i === 0 ? "GKP" : `Sub ${i}`}</span>
                    {#if p.crest}
                      <img
                        src={p.crest}
                        alt={p.club ?? ""}
                        class="w-5 h-5 object-contain my-0.5"
                        loading="lazy"
                        onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                      />
                    {/if}
                    <span class="text-xs font-semibold text-white truncate max-w-[100px]">{p.name}</span>
                    {#if p.opponent}
                      <span class="text-[9px] font-mono text-[#AEB9CC] truncate max-w-[100px]">{p.opponent}</span>
                    {/if}
                    <span class="text-[10px] font-mono text-[#AEB9CC]">({p.points}p)</span>
                  </div>
                {:else}
                  <span class="text-xs text-[#AEB9CC] italic">Ingen spillere på benken</span>
                {/each}
              </div>
            </div>
          </div>

        <!-- FANE 2: TROFEER OG POKALER (CUP OG MÅNEDENS ENER TOPP 3) -->
        {:else if activeTab === "trophies"}
          <div class="space-y-5">
            <!-- Cup Meritter & Playoffs Pokaler -->
            <div class="space-y-3">
              <h4 class="text-xs font-bold text-[#F4C152] uppercase tracking-wider flex items-center gap-1.5">
                <Trophy class="w-4 h-4 text-[#F4C152]" />
                <span>Cup- og playoffsmeritter</span>
              </h4>

              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {#each profile?.cupTrophies || [] as trophy}
                  <div
                    class="p-4 rounded-2xl bg-black/20 border border-[#F4C152]/40 shadow-lg space-y-3 relative overflow-hidden group hover:border-[#F4C152] transition-all hover:scale-[1.01]"
                    title={`Turnering: ${trophy.cupName} | Sesong: ${trophy.season || '—'} | Plassering: ${trophy.place}. plass | Lag: ${profile?.roomName || 'Rom'}`}
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex items-center gap-2.5">
                        <span class="text-3xl drop-shadow">
                          {trophy.place === 1 ? "🥇" : trophy.place === 2 ? "🥈" : "🥉"}
                        </span>
                        <div>
                          <h5 class="text-xs font-bold text-white leading-tight">{trophy.title}</h5>
                          <span class="text-[11px] font-semibold text-[#AEB9CC] flex items-center gap-1 mt-0.5">
                            <span>{profile?.roomName || "Rom"}</span>
                            <span>•</span>
                            <span>{trophy.season || "—"}</span>
                          </span>
                        </div>
                      </div>
                      <span class={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 shadow-sm ${
                        trophy.place === 1
                          ? "bg-[#F4C152]/20 text-[#F4C152] border border-[#F4C152]/40"
                          : trophy.place === 2
                          ? "bg-slate-300/20 text-slate-300 border border-slate-300/40"
                          : "bg-amber-700/20 text-amber-500 border border-amber-700/40"
                      }`}>
                        {trophy.place}. plass
                      </span>
                    </div>

                    <!-- Fremhevet Cupnavn-boks (Lettlest & Hover-info) -->
                    <div class="p-2 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-xs">
                      <div class="flex items-center gap-1.5 truncate">
                        <Trophy class="w-3.5 h-3.5 text-[#F4C152] shrink-0" />
                        <span class="text-xs font-bold text-white truncate" title={trophy.cupName}>
                          {trophy.cupName}
                        </span>
                      </div>
                      {#if trophy.date}
                        <span class="text-[10px] text-[#AEB9CC] font-mono shrink-0 ml-2">
                          {new Date(trophy.date).toLocaleDateString("no-NO", { month: "short", year: "numeric" })}
                        </span>
                      {/if}
                    </div>
                  </div>
                {:else}
                  <div class="col-span-full p-6 rounded-2xl bg-black/20 border border-white/10 text-center space-y-1">
                    <Trophy class="w-8 h-8 text-[#AEB9CC] mx-auto opacity-40" />
                    <p class="text-xs text-[#AEB9CC]">Ingen fullførte cup-troféer ennå</p>
                    <p class="text-[11px] text-[#AEB9CC]/60">Spill cupen og kjemp om gull, sølv og bronse!</p>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Månedens Manager & Enere -->
            <div class="space-y-3 pt-2">
              <h4 class="text-xs font-bold text-[#9FE88D] uppercase tracking-wider flex items-center gap-1.5">
                <Crown class="w-4 h-4 text-[#9FE88D]" />
                <span>Månedsvinnere og beste rom</span>
              </h4>

              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {#each profile?.monthlyTrophies || [] as trophy}
                  <div class="p-4 rounded-2xl bg-black/20 border border-[#9FE88D]/40 shadow-lg space-y-2 relative overflow-hidden">
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <span class="text-3xl drop-shadow shrink-0">
                          {trophy.place === 1 ? "🥇" : trophy.place === 2 ? "🥈" : "🥉"}
                        </span>
                        <div class="min-w-0">
                          <h5 class="text-xs font-bold text-white leading-tight truncate">{trophy.title}</h5>
                          <span class="text-[10px] text-[#9FE88D] font-mono mt-0.5 block">{trophy.score} poeng</span>
                        </div>
                      </div>
                      <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#9FE88D]/20 text-[#9FE88D] border border-[#9FE88D]/40 whitespace-nowrap shrink-0 shadow-sm">
                        {trophy.category === "individual" ? "Solo" : "Beste rom"}
                      </span>
                    </div>
                  </div>
                {:else}
                  <div class="col-span-full p-6 rounded-2xl bg-black/20 border border-white/10 text-center space-y-1">
                    <Medal class="w-8 h-8 text-[#AEB9CC] mx-auto opacity-40" />
                    <p class="text-xs text-[#AEB9CC]">Ingen månedsvinner-pokaler ennå</p>
                    <p class="text-[11px] text-[#AEB9CC]/60">Vinnerne med flest poeng i måneden kåres til månedsvinner og beste rom!</p>
                  </div>
                {/each}
              </div>
            </div>
          </div>

        <!-- FANE 3: STATS & HISTORIKK -->
        {:else if activeTab === "stats"}
          <div class="space-y-4">
            <div class="p-4 rounded-2xl bg-black/20 border border-white/10 space-y-3">
              <span class="text-xs font-bold text-white uppercase tracking-wider block">Poeng per gameweek</span>
              <div class="h-44 flex items-end gap-1.5 pt-4 px-2 overflow-x-auto custom-scrollbar">
                {#each profile?.history || [] as h}
                  <div class="flex flex-col items-center flex-1 min-w-[28px] h-full justify-end group">
                    <span class="text-[9px] font-mono text-[#AEB9CC] mb-1 group-hover:text-white transition-colors">{h.points}</span>
                    <div
                      class="w-full bg-[#9FE88D] rounded-t-md transition-all group-hover:bg-[#8ce078]"
                      style={`height: ${Math.max((h.points / maxHistoryPoints) * 100, 8)}%;`}
                    ></div>
                    <span class="text-[9px] font-mono text-[#AEB9CC] mt-1.5">GW{h.gw}</span>
                  </div>
                {:else}
                  <p class="text-xs text-[#AEB9CC] italic m-auto">Ingen gameweek-resultater registrert ennå</p>
                {/each}
              </div>
            </div>

            <!-- Klatregraf: plassering i ligaen per gameweek (rank 1 = øverst) -->
            <div class="p-4 rounded-2xl bg-black/20 border border-white/10 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-white uppercase tracking-wider block">Klatregraf – plassering i ligaen</span>
                {#if rankPoints.length > 0}
                  <span class="text-[10px] font-mono text-[#AEB9CC]">
                    Nå #{rankPoints[rankPoints.length - 1].leagueRank} / {leagueSize}
                  </span>
                {/if}
              </div>
              {#if rankPoints.length > 1}
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-36">
                  <polyline
                    points={rankPoints
                      .map((h, i) => `${(i / (rankPoints.length - 1)) * 100},${((h.leagueRank - 1) / Math.max(leagueSize - 1, 1)) * 96 + 2}`)
                      .join(" ")}
                    fill="none"
                    stroke="#F4C152"
                    stroke-width="2"
                    vector-effect="non-scaling-stroke"
                    stroke-linejoin="round"
                  />
                  {#each rankPoints as h, i}
                    <circle
                      cx={(i / (rankPoints.length - 1)) * 100}
                      cy={((h.leagueRank - 1) / Math.max(leagueSize - 1, 1)) * 96 + 2}
                      r="1.6"
                      fill="#F4C152"
                      vector-effect="non-scaling-stroke"
                    />
                  {/each}
                </svg>
                <div class="flex justify-between px-0.5">
                  {#each rankPoints as h}
                    <span class="text-[9px] font-mono text-[#AEB9CC]">GW{h.gw}</span>
                  {/each}
                </div>
              {:else}
                <p class="text-xs text-[#AEB9CC] italic">Trenger minst 2 spilte runder for å vise klatregrafen.</p>
              {/if}
            </div>
          </div>

        <!-- FANE 4: CHIPS -->
        {:else if activeTab === "chips"}
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {#each profile?.chips || [] as chip}
              <div class="p-3.5 rounded-2xl bg-black/20 border border-white/10 flex items-center justify-between">
                <div>
                  <h5 class="text-xs font-bold text-white">{chip.name}</h5>
                  <span class="text-[10px] text-[#AEB9CC]">{chip.status}</span>
                </div>
                <span class={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  chip.status === "Brukt"
                    ? "bg-[#FB6F84]/15 text-[#FB6F84] border border-[#FB6F84]/30"
                    : "bg-[#9FE88D]/15 text-[#9FE88D] border border-[#9FE88D]/30"
                }`}>
                  {chip.status}
                </span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- MODAL FOR REDIGERING AV VISNINGSNAVN & AVATAR -->
{#if isEditingProfile}
  <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 text-[#E2E8F0] font-sans">
    <div class="bg-white/[0.055] backdrop-blur-sm border border-white/10 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto custom-scrollbar">
      <div class="flex items-center justify-between pb-3 border-b border-white/10">
        <div class="flex items-center gap-2">
          <Edit3 class="w-5 h-5 text-[#F4C152]" />
          <h3 class="font-bold text-white text-base">Rediger profil og avatar</h3>
        </div>
        <button
          type="button"
          onclick={() => (isEditingProfile = false)}
          class="text-[#AEB9CC] hover:text-white"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Feil- / Suksessmelding -->
      {#if editErrorMessage}
        <div class="p-3 rounded-xl bg-[#FB6F84]/15 border border-[#FB6F84]/30 text-xs text-[#FB6F84] flex items-center gap-2">
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>{editErrorMessage}</span>
        </div>
      {/if}

      {#if editSuccessMessage}
        <div class="p-3 rounded-xl bg-[#9FE88D]/15 border border-[#9FE88D]/30 text-xs text-[#9FE88D] flex items-center gap-2">
          <Check class="w-4 h-4 shrink-0" />
          <span>{editSuccessMessage}</span>
        </div>
      {/if}

      <div class="space-y-4 text-xs">
        <!-- 1. Endre Visningsnavn -->
        <div>
          <label for="edit-profile-username" class="block font-bold text-white mb-1.5">
            Visningsnavn (Brukernavn i ligaen):
          </label>
          <input
            id="edit-profile-username"
            type="text"
            bind:value={editUsername}
            placeholder="f.eks. Stian"
            class="w-full px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white focus:border-[#9FE88D] focus:outline-none text-sm"
          />
        </div>

        <!-- 2. Nåværende Avatar & Egen bildeopplasting -->
        <div class="p-4 rounded-2xl bg-black/20 border border-white/10 space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-bold text-white">Nåværende avatar:</span>
            <div class="flex items-center gap-2">
              {#if editAvatar}
                <img src={editAvatar} alt="Valgt avatar" class="w-10 h-10 rounded-xl bg-white/[0.055] backdrop-blur-sm border border-white/10 object-contain p-1" />
              {:else}
                <div class="w-10 h-10 rounded-xl bg-[#9FE88D] text-[#16380c] flex items-center justify-center font-bold">
                  {editUsername.slice(0, 1) || "U"}
                </div>
              {/if}
            </div>
          </div>

          <div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              bind:this={fileInputRef}
              onchange={handleImageUpload}
              class="hidden"
            />

            <button
              type="button"
              onclick={() => fileInputRef?.click()}
              disabled={isUploadingImage}
              class="w-full py-2.5 rounded-xl bg-white/[0.055] backdrop-blur-sm hover:bg-white/10 border border-white/10 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Upload class={`w-4 h-4 text-[#70E1F8] ${isUploadingImage ? "animate-bounce" : ""}`} />
              <span>{isUploadingImage ? "Laster opp til Convex..." : "Last opp eget bilde fra maskinen (PNG/JPG)"}</span>
            </button>
            <p class="text-[11px] text-[#AEB9CC] mt-1 text-center">
              Bildet lagres permanent i Convex storage og er synlig for alle spillere i ligaen.
            </p>
          </div>
        </div>

        <!-- 3. Premier League Klubbmerker Presets -->
        <div class="space-y-2">
          <span class="block font-bold text-[#F4C152]">
            Eller velg ditt Premier League-klubbmerke:
          </span>
          <div class="grid grid-cols-5 sm:grid-cols-10 gap-2 max-h-36 overflow-y-auto custom-scrollbar p-2 bg-black/20 rounded-xl border border-white/10">
            {#each plClubPresets as club}
              <button
                type="button"
                onclick={() => (editAvatar = club.url)}
                title={club.name}
                class={`p-1.5 rounded-xl border transition-all flex flex-col items-center justify-center aspect-square ${
                  editAvatar === club.url
                    ? "bg-[#9FE88D]/20 border-[#9FE88D] ring-2 ring-[#9FE88D]/40"
                    : "bg-white/[0.055] backdrop-blur-sm border-white/10 hover:border-[#9FE88D]/60"
                }`}
              >
                <img src={club.url} alt={club.name} class="w-6 h-6 object-contain" />
              </button>
            {/each}
          </div>
        </div>

        <!-- 4. Fotball-ikoner Presets -->
        <div class="space-y-2">
          <span class="block font-bold text-[#9FE88D]">
            Eller morsomme fotballfigurer:
          </span>
          <div class="grid grid-cols-6 gap-2 p-2 bg-black/20 rounded-xl border border-white/10">
            {#each footballIconPresets as item}
              <button
                type="button"
                onclick={() => (editAvatar = item.url)}
                title={item.name}
                class={`p-2 rounded-xl border transition-all flex flex-col items-center justify-center aspect-square ${
                  editAvatar === item.url
                    ? "bg-[#9FE88D]/20 border-[#9FE88D] ring-2 ring-[#9FE88D]/40"
                    : "bg-white/[0.055] backdrop-blur-sm border-white/10 hover:border-[#9FE88D]/60"
                }`}
              >
                <img src={item.url} alt={item.name} class="w-7 h-7 object-contain" />
              </button>
            {/each}
          </div>
        </div>
      </div>

      <!-- Knapper -->
      <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
        <button
          type="button"
          onclick={() => (isEditingProfile = false)}
          class="px-4 py-2 rounded-xl bg-white/[0.04] text-[#AEB9CC] hover:text-white text-xs border border-white/10"
        >
          Avbryt
        </button>

        <button
          type="button"
          onclick={handleSaveProfile}
          disabled={isSavingProfile}
          class="px-5 py-2 rounded-xl bg-[#9FE88D] hover:bg-[#8ce078] text-[#16380c] font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md"
        >
          <Check class="w-4 h-4" />
          <span>{isSavingProfile ? "Lagrer..." : "Lagre profil"}</span>
        </button>
      </div>
    </div>
  </div>
{/if}
