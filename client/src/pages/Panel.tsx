import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import QuestionEditor from "@/components/QuestionEditor";
import ContactSettings from "@/components/ContactSettings";
import ContentQuickStart from "@/components/ContentQuickStart";
import CategoryCascadeSelect from "@/components/CategoryCascadeSelect";
import SearchConsoleActionPanel from "@/components/SearchConsoleActionPanel";
import { AdminUsersManagement } from "@/components/AdminUsersManagement";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuestionProductionDashboard } from "@/components/QuestionProductionDashboard";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  getPanelContentType,
  panelContentTypeByRoute,
  panelContentTypeLabels,
} from "@shared/panelModules";
import { refreshAdminUsers } from "@shared/adminUserRole";
import { getPanelSectionFromRoute } from "@shared/panelRoute";
import { toast } from "sonner";
import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Activity,
  ArrowLeft,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CircleDotDashed,
  FileText,
  FolderPlus,
  FolderTree,
  GraduationCap,
  Heart,
  Layers3,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

const roleName: Record<string, string> = {
  admin: "Admin",
  teacher: "Öğretmen",
  moderator: "Moderatör",
  member: "Üye",
  user: "Üye",
};
const managedSections = [
  "Kategoriler",
  "Kurum Kategorisi",
  "Soru Havuzu",
  "Testler",
  "Dokümanlar",
  "Videolar",
  "Simülasyonlar",
  "Oyunlar",
  "Haberler",
] as const;
const hierarchy = [
  "Ana Grup",
  "İlkokul/Ortaokul",
  "Sınıf",
  "Ders",
  "Ünite",
  "Kazanım",
];
const providerLabel: Record<string, string> = {
  s3: "S3",
  "google-drive-personal": "Google Drive · Kişisel",
  "google-drive-workspace": "Google Drive · Workspace",
  "bunny-storage": "Bunny Storage",
  "bunny-stream": "Bunny Stream",
  "bunny-pull-zone": "Bunny CDN · Pull Zone",
};
type CategoryOption = {
  id: number;
  name: string;
  parentId: number | null;
  categoryType: "education" | "institution";
  isActive: boolean;
  level: string;
};
function categoryPath(node: CategoryOption, nodes: CategoryOption[]) {
  const names: string[] = [];
  let current: CategoryOption | undefined = node;
  const visited = new Set<number>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    names.unshift(current.name);
    current = current.parentId
      ? nodes.find(item => item.id === current?.parentId)
      : undefined;
  }
  return names.join(" → ");
}

function PanelContent() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const isAdmin = user?.role === "admin";
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const requestedCategoryId = Number(searchParams?.get("categoryId") ?? 0) || undefined;
  const requestedSection = getPanelSectionFromRoute(
    location,
    typeof window !== "undefined" ? window.location.search : ""
  );
  const sectionAlias: Record<string, string> = {
    "ana-sayfa-yonetimi": "ayarlar",
    "kurum-kategorisi": "kategoriler",
    testler: "icerikler",
    dokumanlar: "icerikler",
    videolar: "icerikler",
    simulasyonlar: "icerikler",
    oyunlar: "icerikler",
    haberler: "icerikler",
  };
  const section =
    requestedSection === "ayarlar" && !isAdmin
      ? "restricted-settings"
      : (sectionAlias[requestedSection] ?? requestedSection);
  const panelSections = trpc.panel.accessibleSections.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const overview = trpc.platform.overview.useQuery();
  const memberDashboard = (trpc as any).member?.dashboard?.useQuery
    ? (trpc as any).member.dashboard.useQuery(undefined, {
        enabled: Boolean(user) && requestedSection === "uye-paneli",
      })
    : { data: undefined, isLoading: false };
  const myQuestions = (trpc as any).member?.myQuestions?.useQuery
    ? (trpc as any).member.myQuestions.useQuery(undefined, {
        enabled: Boolean(user) && requestedSection === "uye-paneli",
      })
    : { data: [], isLoading: false };
  const myAnswers = (trpc as any).member?.myAnswers?.useQuery
    ? (trpc as any).member.myAnswers.useQuery(undefined, {
        enabled: Boolean(user) && requestedSection === "uye-paneli",
      })
    : { data: [], isLoading: false };
  const [permissionRole, setPermissionRole] = useState<"teacher" | "moderator">(
    "teacher"
  );
  const permissions = trpc.permissions.forRole.useQuery(
    { role: permissionRole },
    { enabled: isAdmin }
  );
  const utils = trpc.useUtils();
  const updatePermission = trpc.permissions.update.useMutation({
    onSuccess: () => {
      utils.permissions.forRole.invalidate({ role: permissionRole });
      toast.success("Bölüm erişimi güncellendi.");
    },
    onError: () => toast.error("Erişim ayarı güncellenemedi."),
  });
  const [categoryName, setCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(
    null
  );
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [categoryMode, setCategoryMode] = useState<"education" | "institution">(
    "education"
  );
  const [categoryParentId, setCategoryParentId] = useState("root");
  const categoryNodes = trpc.categories.list.useQuery(
    {},
    { enabled: Boolean(user) }
  );
  const createCategory = trpc.categories.create.useMutation({
    onSuccess: () => {
      setCategoryName("");
      utils.categories.list.invalidate();
      utils.platform.overview.invalidate();
      toast.success("Kategori oluşturuldu.");
    },
    onError: () => toast.error("Kategori oluşturulamadı."),
  });
  const updateInstitutionStatus =
    trpc.categories.setInstitutionStatus.useMutation({
      onSuccess: () => {
        utils.categories.list.invalidate();
        utils.platform.overview.invalidate();
        toast.success("Kurum kategori durumu güncellendi.");
      },
      onError: () => toast.error("Kurum kategori durumu güncellenemedi."),
    });
  const updateCategory = trpc.categories.update.useMutation({
    onSuccess: () => {
      setEditingCategoryId(null);
      setEditingCategoryName("");
      utils.categories.list.invalidate();
      utils.platform.overview.invalidate();
      toast.success("Kategori adı güncellendi.");
    },
    onError: () => toast.error("Kategori adı güncellenemedi."),
  });
  const updateCategoryStatus = trpc.categories.setStatus.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
      utils.platform.overview.invalidate();
      toast.success("Kategori durumu güncellendi.");
    },
    onError: () => toast.error("Kategori durumu güncellenemedi."),
  });
  const categoryOptions = (categoryNodes.data ?? []) as CategoryOption[];
  const categoryContentCounts = useMemo(() => {
    const direct = new Map<number, number>();
    const children = new Map<number, number[]>();
    for (const node of categoryOptions) {
      if (node.parentId) children.set(node.parentId, [...(children.get(node.parentId) ?? []), node.id]);
    }
    for (const item of overview.data?.content ?? []) {
      if (item.categoryId) direct.set(item.categoryId, (direct.get(item.categoryId) ?? 0) + 1);
    }
    const totals = new Map<number, number>();
    const totalFor = (id: number, seen = new Set<number>()): number => {
      if (seen.has(id)) return 0;
      const nextSeen = new Set(seen).add(id);
      const total = (direct.get(id) ?? 0) + (children.get(id) ?? []).reduce((sum, childId) => sum + totalFor(childId, nextSeen), 0);
      totals.set(id, total);
      return total;
    };
    categoryOptions.forEach(node => totalFor(node.id));
    return totals;
  }, [categoryOptions, overview.data?.content]);
  const educationCategoryOptions = categoryOptions
    .filter(item => item.categoryType === "education" && item.isActive)
    .sort((a, b) =>
      categoryPath(a, categoryOptions).localeCompare(
        categoryPath(b, categoryOptions),
        "tr"
      )
    );
  const institutionCategoryOptions = categoryOptions
    .filter(item => item.categoryType === "institution" && item.isActive)
    .sort((a, b) =>
      categoryPath(a, categoryOptions).localeCompare(
        categoryPath(b, categoryOptions),
        "tr"
      )
    );
  const availableParents = categoryOptions.filter(
    item => item.categoryType === categoryMode
  );
  const selectedParent = availableParents.find(
    item => String(item.id) === categoryParentId
  );
  const educationNextLevel: Record<
    string,
    "school-level" | "class" | "subject" | "unit" | "outcome"
  > = {
    "ana-grup": "school-level",
    "school-level": "class",
    class: "subject",
    subject: "unit",
    unit: "outcome",
  };
  const categoryLevel =
    categoryMode === "education"
      ? selectedParent
        ? educationNextLevel[selectedParent.level]
        : "ana-grup"
      : selectedParent
        ? "institution-child"
        : "institution-root";
  const categoryLevelLabel =
    categoryMode === "institution"
      ? selectedParent
        ? "Alt Kurum Kategorisi"
        : "Kurum Kategorisi"
      : ({
          "ana-grup": "Ana Grup",
          "school-level": "İlkokul/Ortaokul",
          class: "Sınıf",
          subject: "Ders",
          unit: "Ünite",
          outcome: "Kazanım",
        }[
          categoryLevel as
            | "ana-grup"
            | "school-level"
            | "class"
            | "subject"
            | "unit"
            | "outcome"
        ] ?? "Kazanım");
  const roleSections = panelSections.data ?? [];
  const isAllowed = (name: string) =>
    isAdmin || (roleSections as string[]).includes(name);
  const [questionPrompt, setQuestionPrompt] = useState("");
  const [questionType, setQuestionType] = useState<
    "multiple-choice" | "true-false" | "open-ended"
  >("multiple-choice");
  const [questionDifficulty, setQuestionDifficulty] = useState<
    "easy" | "medium" | "hard"
  >("medium");
  const [questionCategoryId, setQuestionCategoryId] = useState("");
  const questions = trpc.questions.list.useQuery(undefined, {
    enabled: Boolean(user) && isAllowed("Soru Havuzu"),
  });
  const createQuestion = trpc.questions.create.useMutation({
    onSuccess: () => {
      setQuestionPrompt("");
      utils.questions.list.invalidate();
      toast.success("Soru taslak olarak soru havuzuna eklendi.");
    },
    onError: () => toast.error("Soru kaydedilemedi."),
  });
  const [aiTopic, setAiTopic] = useState("");
  const [aiProvider, setAiProvider] = useState<"openai" | "gemini">("openai");
  const [aiModel, setAiModel] = useState("gpt-5-mini");
  const dynamicAiModels = (trpc.admin as any).listAiProviderModels?.useQuery
    ? (trpc.admin as any).listAiProviderModels.useQuery({ provider: aiProvider }, { enabled: isAdmin && section === "ai", staleTime: 60_000 })
    : undefined;
  const [aiDraft, setAiDraft] = useState<{
    questionType: "multiple-choice" | "true-false" | "open-ended";
    prompt: string;
    options: string[];
    answer: string;
    explanation: string;
  } | null>(null);
  const aiQuestion = trpc.ai.generateQuestion.useMutation({
    onSuccess: draft => {
      setAiDraft(draft);
      toast.success("Yapay zekâ taslağı hazırlandı; kaydetmeden önce inceleyebilirsiniz.");
    },
    onError: () =>
      toast.error(
        "Yapay zekâ ile soru üretilemedi. Lütfen daha sonra tekrar deneyin."
      ),
  });
  const [contentTitle, setContentTitle] = useState("");
  const [contentSummary, setContentSummary] = useState("");
  const [contentCoverUrl, setContentCoverUrl] = useState("");
  const documentUpload = trpc.admin.uploadMediaAsset.useMutation({
    onSuccess: result => {
      if (result.coverImageUrl) {
        setContentCoverUrl(result.coverImageUrl);
        toast.success("Dokümanın ilk sayfası otomatik kapak olarak eklendi.");
      } else {
        toast.info("Otomatik kapak yalnızca PDF dosyalarında oluşturulur.");
      }
    },
    onError: () => toast.error("Doküman yüklenemedi veya kapak oluşturulamadı."),
  });
  const [contentType, setContentType] = useState<
    "test" | "document" | "simulation" | "video" | "game" | "news"
  >("document");
  const selectedContentType =
    getPanelContentType(requestedSection) ?? contentType;
  const contentList = trpc.contents.list.useQuery(
    { contentType: selectedContentType, categoryId: requestedCategoryId },
    {
      enabled:
        Boolean(user) &&
        section === "icerikler" &&
        isAllowed(panelContentTypeLabels[selectedContentType]),
    }
  );
  const categoryContentList = trpc.contents.byCategory?.useQuery
    ? trpc.contents.byCategory.useQuery(
        { categoryId: requestedCategoryId ?? 1 },
        { enabled: Boolean(user) && section === "icerikler" && Boolean(requestedCategoryId) }
      )
    : { data: [], isLoading: false, isError: false };
  const testList = trpc.tests.list.useQuery(undefined, {
    enabled:
      Boolean(user) && (requestedSection === "testler" || section === "bulut-depolama") && isAllowed("Testler"),
  });
  const mediaTargetDocuments = trpc.contents.list.useQuery({ contentType: "document" }, { enabled: isAdmin && section === "bulut-depolama" });
  const mediaTargetVideos = trpc.contents.list.useQuery({ contentType: "video" }, { enabled: isAdmin && section === "bulut-depolama" });
  const mediaTargetSimulations = trpc.contents.list.useQuery({ contentType: "simulation" }, { enabled: isAdmin && section === "bulut-depolama" });
  const mediaTargetGames = trpc.contents.list.useQuery({ contentType: "game" }, { enabled: isAdmin && section === "bulut-depolama" });
  const mediaTargetNews = trpc.contents.list.useQuery({ contentType: "news" }, { enabled: isAdmin && section === "bulut-depolama" });
  const mediaTargetItems = useMemo(() => [
    ...(testList.data ?? []).map(item => ({ id: item.id, title: item.title, targetType: "test" as const, typeLabel: "Test" })),
    ...(mediaTargetDocuments.data ?? []).map(item => ({ id: item.id, title: item.title, targetType: "content" as const, typeLabel: "Doküman" })),
    ...(mediaTargetVideos.data ?? []).map(item => ({ id: item.id, title: item.title, targetType: "content" as const, typeLabel: "Video" })),
    ...(mediaTargetSimulations.data ?? []).map(item => ({ id: item.id, title: item.title, targetType: "content" as const, typeLabel: "Simülasyon" })),
    ...(mediaTargetGames.data ?? []).map(item => ({ id: item.id, title: item.title, targetType: "content" as const, typeLabel: "Oyun" })),
    ...(mediaTargetNews.data ?? []).map(item => ({ id: item.id, title: item.title, targetType: "content" as const, typeLabel: "Haber" })),
  ], [testList.data, mediaTargetDocuments.data, mediaTargetVideos.data, mediaTargetSimulations.data, mediaTargetGames.data, mediaTargetNews.data]);
  const [testTitle, setTestTitle] = useState("");
  const [testDescription, setTestDescription] = useState("");
  const [testCoverUrl, setTestCoverUrl] = useState("");
  const [testDurationMinutes, setTestDurationMinutes] = useState("20");
  const [testCategoryId, setTestCategoryId] = useState("");
  const [testInstitutionCategoryId, setTestInstitutionCategoryId] = useState("");
  const [testQuestionIds, setTestQuestionIds] = useState<number[]>([]);
  const createTest = trpc.tests.create.useMutation({
    onSuccess: () => {
      setTestTitle("");
      setTestDescription("");
      setTestCoverUrl("");
      setTestDurationMinutes("20");
      setTestCategoryId("");
      setTestInstitutionCategoryId("");
      setTestQuestionIds([]);
      utils.tests.list.invalidate();
      toast.success("Test taslak olarak kaydedildi.");
    },
    onError: () => toast.error("Test kaydedilemedi."),
  });
  const [contentCategoryId, setContentCategoryId] = useState("");
  const [contentInstitutionCategoryId, setContentInstitutionCategoryId] = useState("");
  const createContent = trpc.contents.create.useMutation({
    onSuccess: () => {
      setContentTitle("");
      setContentSummary("");
      setContentCoverUrl("");
      setContentCategoryId("");
      setContentInstitutionCategoryId("");
      utils.platform.overview.invalidate();
      utils.contents.list.invalidate({ contentType: selectedContentType });
      toast.success("İçerik taslak olarak kaydedildi.");
    },
    onError: () => toast.error("İçerik kaydedilemedi."),
  });
  const archiveContent = trpc.contents.archive.useMutation({
    onSuccess: () => {
      utils.contents.list.invalidate({ contentType: selectedContentType });
      utils.platform.overview.invalidate();
      toast.success("İçerik arşivlendi.");
    },
    onError: () => toast.error("İçerik arşivlenemedi."),
  });
  const activePermissions = useMemo(
    () =>
      new Map(
        (permissions.data ?? []).map(item => [item.section, item.isEnabled])
      ),
    [permissions.data]
  );
  const adminUsers = trpc.admin.users.useQuery(undefined, { enabled: isAdmin });
  const updateUserRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: async () => {
      await refreshAdminUsers(utils);
      toast.success("Kullanıcı rolü güncellendi.");
    },
    onError: () => toast.error("Kullanıcı rolü güncellenemedi."),
  });
  const securityEvents = trpc.security.list.useQuery(undefined, {
    enabled: isAdmin,
  });
  const adminSettings = trpc.admin.settings.useQuery(undefined, {
    enabled: isAdmin,
  });
  const aiProviderStatus = (trpc.admin as any).aiProviderStatus?.useQuery
    ? (trpc.admin as any).aiProviderStatus.useQuery(undefined, { enabled: isAdmin && section === "ai" })
    : { data: undefined };
  const testAiProviderConnection = (trpc.admin as any).testAiProviderConnection?.useMutation
    ? (trpc.admin as any).testAiProviderConnection.useMutation({
        onSuccess: (result: { success: boolean; message: string }) => toast[result.success ? "success" : "error"](result.message),
        onError: () => toast.error("AI sağlayıcı bağlantı testi başarısız oldu."),
      })
    : { isPending: false, mutate: () => undefined };
  const qaQuestions = (trpc.admin as any).qaQuestions?.useQuery
    ? (trpc.admin as any).qaQuestions.useQuery(undefined, {
        enabled: isAdmin && requestedSection === "soru-cevap",
      })
    : { data: [], refetch: async () => undefined };
  const qaAnswers = (trpc.admin as any).qaAnswers?.useQuery
    ? (trpc.admin as any).qaAnswers.useQuery(undefined, {
        enabled: isAdmin && requestedSection === "soru-cevap",
      })
    : { data: [], refetch: async () => undefined };
  const setQaStatus = (trpc.admin as any).setQaStatus?.useMutation
    ? (trpc.admin as any).setQaStatus.useMutation({
        onSuccess: () => {
          qaQuestions.refetch();
          qaAnswers.refetch();
          toast.success("Soru-Cevap durumu güncellendi.");
        },
        onError: (error: { message?: string }) =>
          toast.error(error.message || "Durum güncellenemedi."),
      })
    : { mutate: () => undefined, isPending: false };
  const searchConsoleStatus = trpc.admin.searchConsoleStatus.useQuery(
    undefined,
    { enabled: isAdmin && section === "search-console" }
  );
  const searchConsoleAction = (trpc.admin as any).searchConsoleAction?.useMutation({
    onSuccess: () => toast.success("Search Console işlemi tamamlandı."),
    onError: (error: { message?: string }) => toast.error(error.message || "Search Console işlemi başarısız oldu."),
  }) ?? { mutate: () => undefined, isPending: false, data: undefined };
  const testProviderConnection = trpc.admin.testProviderConnection.useMutation({
    onSuccess: result =>
      toast.success(
        result.configured
          ? "Alanlar doğrulandı; secret değerleri sunucuda gösterilmedi."
          : `Eksik alanlar: ${result.missingKeys.join(", ")}`
      ),
    onError: error =>
      toast.error(error.message || "Bağlantı testi başarısız oldu."),
  });
  const [cloudStorageConfig, setCloudStorageConfig] = useState({
    apiKey: "",
    apiSecret: "",
    accessKeyId: "",
    secretAccessKey: "",
    bucketName: "",
    storageZone: "",
    streamLibraryId: "",
    dnsZoneId: "",
    pullZoneId: "",
    cdnHostname: "",
    originUrl: "",
    zoneSecurityKey: "",
    customDomain: "",
    region: "",
    endpoint: "",
    clientId: "",
    clientSecret: "",
    sharedDriveId: "",
    propertyId: "",
    measurementId: "",
    channelId: "",
    channelUrl: "",
    videoUrl: "",
    embedUrl: "",
  });
  const mediaAssets = trpc.admin.mediaAssets.useQuery(undefined, {
    enabled:
      isAdmin &&
      (section === "bulut-depolama" ||
        section === "icerikler" ||
        section === "reklam" ||
        requestedSection === "testler"),
  });
  const mediaTransferJobs = trpc.admin.mediaTransferJobs.useQuery(undefined, {
    enabled: isAdmin && section === "bulut-depolama",
  });
  const [mediaFileName, setMediaFileName] = useState("");
  const [mediaProvider, setMediaProvider] = useState<
    | "s3"
    | "google-drive-personal"
    | "google-drive-workspace"
    | "bunny-storage"
    | "bunny-stream"
  >("s3");
  const [mediaPublicUrl, setMediaPublicUrl] = useState("");
  const [mediaFolderPath, setMediaFolderPath] = useState("");
  const [mediaMimeType, setMediaMimeType] = useState(
    "application/octet-stream"
  );
  const [mediaContentType, setMediaContentType] = useState<
    "test" | "document" | "video" | "simulation" | "game" | "news" | "general"
  >("general");
  const [mediaSearch, setMediaSearch] = useState("");
  const [mediaProviderFilter, setMediaProviderFilter] = useState("all");
  const [mediaContentFilter, setMediaContentFilter] = useState("all");
  const [mediaFolderFilter, setMediaFolderFilter] = useState("all");
  const createMediaAsset = trpc.admin.createMediaAsset.useMutation({
    onSuccess: () => {
      setMediaFileName("");
      setMediaPublicUrl("");
      setMediaFolderPath("");
      utils.admin.mediaAssets.invalidate();
      toast.success("Medya metadata kaydı oluşturuldu.");
    },
    onError: error =>
      toast.error(error.message || "Medya kaydı oluşturulamadı."),
  });
  const uploadMediaAsset = trpc.admin.uploadMediaAsset.useMutation({
    onSuccess: () => {
      setMediaFileName("");
      setMediaPublicUrl("");
      setMediaFolderPath("");
      utils.admin.mediaAssets.invalidate();
      toast.success("Dosya S3’e yüklendi ve medya kaydı oluşturuldu.");
    },
    onError: error => toast.error(error.message || "Dosya yüklenemedi."),
  });
  const [transferAssetId, setTransferAssetId] = useState("");
  const [transferTarget, setTransferTarget] = useState<
    | "s3"
    | "google-drive-personal"
    | "google-drive-workspace"
    | "bunny-storage"
    | "bunny-stream"
  >("bunny-storage");
  const [transferOperation, setTransferOperation] = useState<"copy" | "move">(
    "copy"
  );
  const createTransferJob = trpc.admin.createMediaTransferJob.useMutation({
    onSuccess: () => {
      setTransferAssetId("");
      utils.admin.mediaTransferJobs.invalidate();
      toast.success("Medya aktarım işi kuyruğa alındı.");
    },
    onError: error =>
      toast.error(error.message || "Medya aktarım işi oluşturulamadı."),
  });
  const retryTransferJob = trpc.admin.retryMediaTransferJob.useMutation({
    onSuccess: () => {
      utils.admin.mediaTransferJobs.invalidate();
      toast.success("Aktarım işi yeniden kuyruğa alındı.");
    },
    onError: error =>
      toast.error(error.message || "Aktarım işi yeniden başlatılamadı."),
  });
  const cancelTransferJob = trpc.admin.cancelMediaTransferJob.useMutation({
    onSuccess: () => {
      utils.admin.mediaTransferJobs.invalidate();
      toast.success("Aktarım işi iptal edildi.");
    },
    onError: error =>
      toast.error(error.message || "Aktarım işi iptal edilemedi."),
  });
  const archiveMedia = trpc.admin.archiveMediaAsset.useMutation({
    onSuccess: () => {
      utils.admin.mediaAssets.invalidate();
      toast.success("Medya arşivlendi.");
    },
    onError: () => toast.error("Medya arşivlenemedi."),
  });
  const [linkMediaId, setLinkMediaId] = useState("");
  const [linkTargetId, setLinkTargetId] = useState("");
  const [linkRole, setLinkRole] = useState("attachment");
  const linkMediaAsset = trpc.admin.linkMediaAsset.useMutation({
    onSuccess: () => {
      setLinkMediaId("");
      utils.admin.mediaAssetLinks.invalidate();
      toast.success("Medya kayda bağlandı.");
    },
    onError: error => toast.error(error.message || "Medya kayda bağlanamadı."),
  });
  const unlinkMediaAsset = trpc.admin.unlinkMediaAsset.useMutation({
    onSuccess: () => {
      utils.admin.mediaAssetLinks.invalidate();
      toast.success("Medya bağlantısı kaldırıldı.");
    },
    onError: error =>
      toast.error(error.message || "Medya bağlantısı kaldırılamadı."),
  });
  const linkedMediaTargetType =
    requestedSection === "testler" ? "test" : "content";
  const linkedMediaTargetId = Number(linkTargetId) || 1;
  const linkedMedia = trpc.admin.mediaAssetLinks.useQuery(
    { targetType: linkedMediaTargetType, targetId: linkedMediaTargetId },
    {
      enabled:
        isAdmin &&
        (requestedSection === "testler" || section === "icerikler") &&
        Number(linkTargetId) > 0,
    }
  );
  const [settingValue, setSettingValue] = useState("");
  const [searchConsoleConfig, setSearchConsoleConfig] = useState<CloudStorageConfig>({
    apiKey: "",
    apiSecret: "",
    accessKeyId: "",
    secretAccessKey: "",
    bucketName: "",
    storageZone: "",
    streamLibraryId: "",
    dnsZoneId: "",
    pullZoneId: "",
    cdnHostname: "",
    originUrl: "",
    zoneSecurityKey: "",
    customDomain: "",
    region: "",
    endpoint: "",
    clientId: "",
    clientSecret: "",
    sharedDriveId: "",
    propertyId: "",
    measurementId: "",
    channelId: "",
    channelUrl: "",
    videoUrl: "",
    embedUrl: "",
    redirectUri: "",
    siteUrl: "",
  });
  const [adSensePublisherId, setAdSensePublisherId] = useState("");
  const [customAdSnippet, setCustomAdSnippet] = useState("");
  const saveSetting = trpc.admin.saveSetting.useMutation({
    onSuccess: () => {
      setSettingValue("");
      utils.admin.settings.invalidate();
      toast.success("Site ayarı kaydedildi.");
    },
    onError: () => toast.error("Site ayarı kaydedilemedi."),
  });
  const [newsCategoryName, setNewsCategoryName] = useState("");
  const newsCategories = trpc.admin.newsCategories.useQuery(undefined, {
    enabled: isAdmin,
  });
  const createNewsCategory = trpc.admin.createNewsCategory.useMutation({
    onSuccess: () => {
      setNewsCategoryName("");
      utils.admin.newsCategories.invalidate();
      toast.success("Haber kategorisi eklendi.");
    },
    onError: () => toast.error("Haber kategorisi eklenemedi."),
  });
  const homeSlides = trpc.admin.homeSlides.useQuery(undefined, {
    enabled: isAdmin,
  });
  const popularEducationCategories =
    trpc.admin.popularEducationCategories.useQuery(undefined, {
      enabled: isAdmin,
    });
  const [popularCategoryIds, setPopularCategoryIds] = useState<number[]>([]);
  useEffect(() => {
    if (popularEducationCategories.data)
      setPopularCategoryIds(popularEducationCategories.data.selectedIds);
  }, [popularEducationCategories.data]);
  const savePopularEducationCategories =
    trpc.admin.savePopularEducationCategories.useMutation({
      onSuccess: () => {
        utils.admin.popularEducationCategories.invalidate();
        utils.platform.popularEducationCategories.invalidate();
        toast.success("Popüler eğitim kategorileri kaydedildi.");
      },
      onError: () => toast.error("Popüler eğitim kategorileri kaydedilemedi."),
    });
  const togglePopularCategory = (categoryId: number) =>
    setPopularCategoryIds(current =>
      current.includes(categoryId)
        ? current.filter(id => id !== categoryId)
        : current.length >= 12
          ? current
          : [...current, categoryId]
    );
  const movePopularCategory = (index: number, direction: -1 | 1) =>
    setPopularCategoryIds(current => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const [editingSlideId, setEditingSlideId] = useState<number | null>(null);
  const [slideEyebrow, setSlideEyebrow] = useState("");
  const [slideTitle, setSlideTitle] = useState("");
  const [slideDescription, setSlideDescription] = useState("");
  const [slideButtonLabel, setSlideButtonLabel] = useState("");
  const [slideButtonLink, setSlideButtonLink] = useState("");
  const [slideImageUrl, setSlideImageUrl] = useState("");
  const [slideSortOrder, setSlideSortOrder] = useState("0");
  const [slideIsActive, setSlideIsActive] = useState(true);
  const resetSlideForm = () => {
    setEditingSlideId(null);
    setSlideEyebrow("");
    setSlideTitle("");
    setSlideDescription("");
    setSlideButtonLabel("");
    setSlideButtonLink("");
    setSlideImageUrl("");
    setSlideSortOrder("0");
    setSlideIsActive(true);
  };
  const sliderPayload = () => ({
    eyebrow: slideEyebrow.trim() || null,
    title: slideTitle.trim(),
    description: slideDescription.trim() || null,
    buttonLabel: slideButtonLabel.trim() || null,
    buttonLink: slideButtonLink.trim() || null,
    imageUrl: slideImageUrl.trim() || null,
    sortOrder: Number(slideSortOrder || 0),
    isActive: slideIsActive,
  });
  const createHomeSlide = trpc.admin.createHomeSlide.useMutation({
    onSuccess: () => {
      resetSlideForm();
      utils.admin.homeSlides.invalidate();
      utils.platform.homeSlides.invalidate();
      toast.success("Slider kaydı oluşturuldu.");
    },
    onError: () =>
      toast.error(
        "Slider kaydı oluşturulamadı. Görsel bağlantısını kontrol edin."
      ),
  });
  const updateHomeSlide = trpc.admin.updateHomeSlide.useMutation({
    onSuccess: () => {
      resetSlideForm();
      utils.admin.homeSlides.invalidate();
      utils.platform.homeSlides.invalidate();
      toast.success("Slider kaydı güncellendi.");
    },
    onError: () => toast.error("Slider kaydı güncellenemedi."),
  });
  const deleteHomeSlide = trpc.admin.deleteHomeSlide.useMutation({
    onSuccess: () => {
      resetSlideForm();
      utils.admin.homeSlides.invalidate();
      utils.platform.homeSlides.invalidate();
      toast.success("Slider kaydı silindi.");
    },
    onError: () => toast.error("Slider kaydı silinemedi."),
  });
  const editSlide = (slide: NonNullable<typeof homeSlides.data>[number]) => {
    setEditingSlideId(slide.id);
    setSlideEyebrow(slide.eyebrow ?? "");
    setSlideTitle(slide.title);
    setSlideDescription(slide.description ?? "");
    setSlideButtonLabel(slide.buttonLabel ?? "");
    setSlideButtonLink(slide.buttonLink ?? "");
    setSlideImageUrl(slide.imageUrl ?? "");
    setSlideSortOrder(String(slide.sortOrder));
    setSlideIsActive(slide.isActive);
  };

  const titleMap: Record<
    string,
    { eyebrow: string; title: string; text: string }
  > = {
    genel: {
      eyebrow: "Kontrol merkezi",
      title: "Öğrenme ekosisteminize hoş geldiniz.",
      text: "Bu alan, rolünüz için açık olan modüllere hızlı erişim sağlar.",
    },
    kategoriler: {
      eyebrow: "Eğitim kategorisi",
      title: "İçerikleri doğru öğrenme bağlamına yerleştirin.",
      text: "Ana Grup → İlkokul/Ortaokul → Sınıf → Ders → Ünite → Kazanım sırası sabittir.",
    },
    "soru-havuzu": {
      eyebrow: "Ölçme alanı",
      title: "Soru havuzunuzu güvenle büyütün.",
      text: "Çoktan seçmeli, doğru-yanlış ve açık uçlu sorular için merkezi çalışma alanı.",
    },
    icerikler: {
      eyebrow: "İçerik stüdyosu",
      title: "Tüm içerik türleri aynı düzende.",
      text: "Testler, Dokümanlar, Simülasyonlar, Videolar, Oyunlar ve Haberler kategoriyle ilişkilendirilir.",
    },
    ai: {
      eyebrow: "Yapay zekâ üretimi",
      title: "Kazanımdan ölçme deneyimine.",
      text: "Konu veya kazanım seçerek yapılandırılmış soru ve test taslakları oluşturun.",
    },
    "ana-sayfa-yonetimi": {
      eyebrow: "Ana sayfa yönetimi",
      title: "Ana sayfanızın vitrini burada.",
      text: "Slider, popüler eğitim kategorileri, SEO, reklam ve site haritası ayarlarını tek merkezden yönetin.",
    },
    "kurum-kategorisi": {
      eyebrow: "Kurum kategorisi",
      title: "Kamu ve kurum sınavlarını ayrı yönetin.",
      text: "KPSS ve kamu kurumu sınavları için bağımsız alt kategori ağacını yönetin.",
    },
    testler: {
      eyebrow: "Test yönetimi",
      title: "Test içeriklerini tek merkezden yönetin.",
      text: "Test taslaklarını kategori, soru ve yayın akışıyla düzenleyin.",
    },
    dokumanlar: {
      eyebrow: "Doküman yönetimi",
      title: "Kaynak arşivinizi düzenleyin.",
      text: "Doküman taslaklarını eğitim ve kurum kategorileriyle ilişkilendirin.",
    },
    videolar: {
      eyebrow: "Video yönetimi",
      title: "Video içeriklerini yönetin.",
      text: "Anlatım videolarını kategori ve yayın durumuyla takip edin.",
    },
    simulasyonlar: {
      eyebrow: "Simülasyon yönetimi",
      title: "Etkileşimli öğrenme alanları oluşturun.",
      text: "Simülasyon taslaklarını içerik merkezinden yönetin.",
    },
    oyunlar: {
      eyebrow: "Oyun yönetimi",
      title: "Eğitsel oyunları düzenleyin.",
      text: "Oyun içeriklerini sınıf, ders ve kurum bağlamına bağlayın.",
    },
    haberler: {
      eyebrow: "Haber yönetimi",
      title: "Eğitim gündemini yönetin.",
      text: "Haberleri bağımsız haber kategorileri altında taslak olarak hazırlayın.",
    },
    "bulut-depolama": {
      eyebrow: "Bulut depolama",
      title: "Dosyalarınızı sağlayıcılar arasında yönetin.",
      text: "S3, Google Drive kişisel/Workspace ve Bunny.net bağlantıları hosting sonrası etkinleştirilebilir.",
    },
    reklam: {
      eyebrow: "Reklam alanı",
      title: "AdSense ve özel firma reklamlarını yönetin.",
      text: "AdSense Türkiye bağlantısı, reklam slotları ve özel kampanyalar tek merkezden hazırlanır.",
    },
    "search-console": {
      eyebrow: "SEO ve Search Console",
      title: "Arama görünürlüğünüzü izleyin.",
      text: "Google Search Console mülkü, sitemap ve URL denetimi bağlantıları hosting sonrası etkinleştirilebilir.",
    },
  };
  const page = titleMap[requestedSection] ??
    titleMap[section] ?? {
      eyebrow: "OkulBlog paneli",
      title: "Bu alan yapılandırılıyor.",
      text: "Rolünüze uygun modül ve izin ayarları burada görünür.",
    };

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <div className="flex flex-col gap-5 rounded-[26px] border border-[#e4e5db] bg-[#fbfaf4] p-6 shadow-[0_12px_35px_rgba(37,61,77,.05)] sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold tracking-[.18em] text-[#668278] uppercase">
            {page.eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-.05em] text-[#18344f] sm:text-4xl">
            {page.title}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#657b87]">
            {page.text}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#d9eee7] text-[#266b5d]">
            <GraduationCap size={22} />
          </div>
          <div>
            <p className="text-sm font-bold text-[#244359]">OkulBlog hesabı</p>
            <Badge className="mt-1 border-0 bg-[#eef4f0] text-[#548073] hover:bg-[#eef4f0]">
              {roleName[user?.role ?? "member"]}
            </Badge>
          </div>
        </div>
      </div>

      {isAdmin && requestedSection === "overview" && (
        <ContentQuickStart onNavigate={route => setLocation(route)} />
      )}

      {section === "restricted-settings" && <RestrictedNotice />}

      {section === "bulut-depolama" && (
        <>
          <AdminOnlyIntegrationSection
            title="Bulut Depolama"
            description="Sağlayıcıya göre API key, secret, bucket/zone, region ve endpoint bilgilerini girip güvenli bağlantı alanı doğrulaması yapabilirsiniz."
            providers={[
              "S3 · Dahili güvenli depolama",
              "Google Drive · Kişisel hesap",
              "Google Drive · Workspace / Ortak Drive",
              "Bunny Storage",
              "Bunny CDN · Pull Zone",
              "Bunny Stream · Video",
              "Bunny DNS Zone",
            ]}
            isAdmin={isAdmin}
            settings={adminSettings}
            testProviderConnection={testProviderConnection}
            storageConfig={cloudStorageConfig}
            setStorageConfig={setCloudStorageConfig}
          />
          <MediaManagementPanel
            isAdmin={isAdmin}
            assets={mediaAssets}
            mediaFileName={mediaFileName}
            setMediaFileName={setMediaFileName}
            mediaProvider={mediaProvider}
            setMediaProvider={setMediaProvider}
            mediaPublicUrl={mediaPublicUrl}
            setMediaPublicUrl={setMediaPublicUrl}
            mediaFolderPath={mediaFolderPath}
            setMediaFolderPath={setMediaFolderPath}
            uploadMediaAsset={uploadMediaAsset}
            mediaMimeType={mediaMimeType}
            setMediaMimeType={setMediaMimeType}
            mediaContentType={mediaContentType}
            setMediaContentType={setMediaContentType}
            mediaSearch={mediaSearch}
            setMediaSearch={setMediaSearch}
            mediaProviderFilter={mediaProviderFilter}
            setMediaProviderFilter={setMediaProviderFilter}
            mediaContentFilter={mediaContentFilter}
            setMediaContentFilter={setMediaContentFilter}
            mediaFolderFilter={mediaFolderFilter}
            setMediaFolderFilter={setMediaFolderFilter}
            createMediaAsset={createMediaAsset}
            transferJobs={mediaTransferJobs}
            transferAssetId={transferAssetId}
            setTransferAssetId={setTransferAssetId}
            transferTarget={transferTarget}
            setTransferTarget={setTransferTarget}
            transferOperation={transferOperation}
            setTransferOperation={setTransferOperation}
            createTransferJob={createTransferJob}
            retryTransferJob={retryTransferJob}
            cancelTransferJob={cancelTransferJob}
            archiveMedia={archiveMedia}
            contentTargets={mediaTargetItems}
            linkMediaAsset={linkMediaAsset}
          />
        </>
      )}
      {section === "reklam" && (
        <>
          <AdminOnlyIntegrationSection
            title="Reklam Alanı"
            description="AdSense Türkiye ve özel firma reklamları için slot, kampanya ve medya bağlantısı hazırlığı."
            providers={[
              "Google AdSense · Yayıncı ve slot ayarları",
              "Özel firma · Banner/video kampanyaları",
              "Ana sayfa · İçerik · Test sonuçları yerleşimleri",
            ]}
            isAdmin={isAdmin}
            settings={adminSettings}
            testProviderConnection={testProviderConnection}
          />
          <AdConfigurationPanel
            isAdmin={isAdmin}
            saveSetting={saveSetting}
            assets={mediaAssets}
          />
        </>
      )}
      {section === "search-console" && (
        <>
          <AdminOnlyIntegrationSection
            title="Google Search Console"
            description="Mülk doğrulama, sitemap, URL denetimi ve performans verileri hosting sonrası Google OAuth ile bağlanacak."
            providers={[
              "Mülk bağlantısı ve doğrulama",
              "Sitemap gönderme ve durum takibi",
              "URL Inspection ve indeksleme görünümü",
              "Search Analytics performans raporu",
            ]}
            isAdmin={isAdmin}
            settings={adminSettings}
            testProviderConnection={testProviderConnection}
            storageConfig={searchConsoleConfig}
            setStorageConfig={setSearchConsoleConfig}
            initialProvider="search-console"
          />
          <SearchConsoleStatusPanel status={searchConsoleStatus} />
          <SearchConsoleActionPanel propertyUrl={searchConsoleStatus.data?.propertyUrl ?? searchConsoleConfig.siteUrl} mutation={searchConsoleAction} />
        </>
      )}

      {section === "genel" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Eğitim Kategorileri"
              value={String(overview.data?.educationCategories.length ?? 0)}
              icon={FolderTree}
              tone="bg-[#e0f2ea] text-[#276e61]"
            />
            <StatCard
              label="Kurum Kategorileri"
              value={String(overview.data?.institutionCategories.length ?? 0)}
              icon={Layers3}
              tone="bg-[#f8edcf] text-[#9c7427]"
            />
            <StatCard
              label="Yayınlanan İçerik"
              value={String(overview.data?.content.length ?? 0)}
              icon={FileText}
              tone="bg-[#e7e5f8] text-[#62538d]"
            />
            <StatCard
              label="Açık Modüller"
              value={String(
                isAdmin ? managedSections.length : roleSections.length
              )}
              icon={CheckCircle2}
              tone="bg-[#e0eaf5] text-[#386886]"
            />
          </div>
          {(isAdmin || user?.role === "teacher") && <QuestionProductionDashboard className="mt-5" />}
          <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
            <section className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-[#23435a]">
                    Rolünüze açık modüller
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#74878f]">
                    Admin tarafından görünürlüğü belirlenen çalışma alanları.
                  </p>
                </div>
                <LockKeyhole size={18} className="text-[#729487]" />
              </div>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {(isAdmin ? managedSections : roleSections).length ? (
                  (isAdmin ? managedSections : roleSections).map(name => (
                    <button
                      key={name}
                      onClick={() =>
                        setLocation(
                          `/panel/${name.toLocaleLowerCase("tr-TR").replaceAll(" ", "-").replace("ı", "i").replace("ş", "s")}`
                        )
                      }
                      className="flex items-center justify-between rounded-xl border border-[#edf0eb] px-4 py-3 text-left text-sm font-semibold text-[#39566a] transition hover:border-[#c8ddd5] hover:bg-[#f7fbf8]"
                    >
                      <span>{name}</span>
                      <ChevronRight size={16} className="text-[#91aaa3]" />
                    </button>
                  ))
                ) : (
                  <div className="rounded-xl bg-[#f7f8f4] p-5 text-sm text-[#728087] sm:col-span-2">
                    Bu rol için henüz açık bir modül yok. Admin panelinden
                    ilgili erişim ayarı açılabilir.
                  </div>
                )}
              </div>
            </section>
            <section className="rounded-[24px] bg-[#18344f] p-6 text-white">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Kategori mimarisi</p>
                <CircleDotDashed size={18} className="text-[#f3d07b]" />
              </div>
              <p className="mt-3 text-sm leading-6 text-[#c8d4d6]">
                Eğitim içerikleri sabit sıradaki altı adım üzerinden
                ilişkilendirilir.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {hierarchy.map((name, index) => (
                  <div className="flex items-center gap-2" key={name}>
                    <span className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-[#edf4f2]">
                      {name}
                    </span>
                    {index < hierarchy.length - 1 && (
                      <ChevronRight size={14} className="text-[#80afa5]" />
                    )}
                  </div>
                ))}
              </div>
              <Button
                onClick={() => setLocation("/panel/kategoriler")}
                className="mt-8 bg-[#f3d07b] text-[#203b51] hover:bg-[#f7dfa0]"
              >
                Kategori yönetimine git{" "}
                <ArrowLeft className="rotate-180" size={16} />
              </Button>
            </section>
          </div>
        </>
      )}

      {section === "uye-paneli" && (
        <section className="space-y-5">
          <div className="rounded-[24px] bg-[#18344f] p-6 text-white">
            <p className="text-xs font-bold tracking-[.16em] text-[#a5cac0] uppercase">
              Üye Panelim
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Öğrenme geçmişin tek yerde
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c8d4d6]">
              Favorilediğin içerikleri, tamamladığın çalışmalarını ve test
              sonuçlarını burada görebilirsin. Üyelik isteğe bağlıdır; kayıt
              olmadan içerikleri kullanabilir, kayıt olduğunda ilerlemeni
              saklayabilirsin.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Favori içerik"
              value={String(memberDashboard.data?.favorites.length ?? 0)}
              icon={Heart}
              tone="bg-[#f8edcf] text-[#9c7427]"
            />
            <StatCard
              label="Tamamlanan içerik"
              value={String(
                memberDashboard.data?.progress.filter(
                  (item: { status: string }) => item.status === "completed"
                ).length ?? 0
              )}
              icon={CheckCircle2}
              tone="bg-[#e0f2ea] text-[#276e61]"
            />
            <StatCard
              label="Test denemesi"
              value={String(memberDashboard.data?.attempts.length ?? 0)}
              icon={Target}
              tone="bg-[#e7e5f8] text-[#62538d]"
            />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold tracking-[.14em] text-[#7b928f] uppercase">
                    Favoriler
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-[#29465a]">
                    Kaydettiğin içerikler
                  </h2>
                </div>
                <Heart size={20} className="text-[#b48a36]" />
              </div>
              <div className="mt-5 space-y-2">
                {memberDashboard.isLoading ? (
                  <p className="text-sm text-[#71838b]">
                    Favoriler yükleniyor...
                  </p>
                ) : (memberDashboard.data?.favorites ?? []).length ? (
                  memberDashboard.data?.favorites.map(
                    (item: {
                      id: number;
                      contentType: string;
                      contentId: number;
                    }) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl bg-[#f7f8f4] px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[#365368]">
                            {item.contentType}
                          </p>
                          <p className="text-xs text-[#7b8b90]">
                            İçerik #{item.contentId}
                          </p>
                        </div>
                        <Badge variant="outline">Favori</Badge>
                      </div>
                    )
                  )
                ) : (
                  <p className="rounded-xl bg-[#f7f8f4] p-4 text-sm text-[#71838b]">
                    Henüz favori içeriğin yok.
                  </p>
                )}
              </div>
            </section>
            <section className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold tracking-[.14em] text-[#7b928f] uppercase">
                    Test sonuçları
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-[#29465a]">
                    Son denemelerin
                  </h2>
                </div>
                <Target size={20} className="text-[#62538d]" />
              </div>
              <div className="mt-5 space-y-2">
                {(memberDashboard.data?.attempts ?? []).length ? (
                  memberDashboard.data?.attempts.map(
                    (item: {
                      id: number;
                      testId: number;
                      score: number;
                      correctCount: number;
                      wrongCount: number;
                      blankCount: number;
                    }) => (
                      <div
                        key={item.id}
                        className="rounded-xl bg-[#f7f8f4] px-4 py-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-[#365368]">
                            Test #{item.testId}
                          </p>
                          <Badge className="border-0 bg-[#e0f2ea] text-[#276e61] hover:bg-[#e0f2ea]">
                            {item.score} puan
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-[#7b8b90]">
                          Doğru {item.correctCount} · Yanlış {item.wrongCount} ·
                          Boş {item.blankCount}
                        </p>
                      </div>
                    )
                  )
                ) : (
                  <p className="rounded-xl bg-[#f7f8f4] p-4 text-sm text-[#71838b]">
                    Henüz test sonucu bulunmuyor.
                  </p>
                )}
              </div>
            </section>
          </div>
          <section className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-[.14em] text-[#7b928f] uppercase">
                  Profil etkileşimleri
                </p>
                <h2 className="mt-2 text-xl font-bold text-[#29465a]">
                  Sorularım ve Cevaplarım
                </h2>
              </div>
              <Badge variant="outline">
                {(myQuestions.data?.length ?? 0) +
                  (myAnswers.data?.length ?? 0)}{" "}
                kayıt
              </Badge>
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="font-bold text-[#365368]">Sorularım</h3>
                <div className="mt-3 space-y-2">
                  {(myQuestions.data ?? []).length ? (
                    myQuestions.data.map(
                      (item: {
                        id: number;
                        title: string;
                        status: string;
                        categoryId: number | null;
                      }) => (
                        <div
                          key={item.id}
                          className="rounded-xl bg-[#f7f8f4] p-4"
                        >
                          <p className="text-sm font-semibold text-[#365368]">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs text-[#7b8b90]">
                            Durum: {item.status} · Kategori:{" "}
                            {item.categoryId ?? "Genel"}
                          </p>
                        </div>
                      )
                    )
                  ) : (
                    <p className="rounded-xl bg-[#f7f8f4] p-4 text-sm text-[#71838b]">
                      Henüz soru sormadın.
                    </p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-[#365368]">Cevaplarım</h3>
                <div className="mt-3 space-y-2">
                  {(myAnswers.data ?? []).length ? (
                    myAnswers.data.map(
                      (item: {
                        id: number;
                        questionId: number;
                        status: string;
                      }) => (
                        <div
                          key={item.id}
                          className="rounded-xl bg-[#f7f8f4] p-4"
                        >
                          <p className="text-sm font-semibold text-[#365368]">
                            Soru #{item.questionId}
                          </p>
                          <p className="mt-1 text-xs text-[#7b8b90]">
                            Durum: {item.status}
                          </p>
                        </div>
                      )
                    )
                  ) : (
                    <p className="rounded-xl bg-[#f7f8f4] p-4 text-sm text-[#71838b]">
                      Henüz cevap yazmadın.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </section>
      )}

      {section === "kategoriler" && (
        <section className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
          <div className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e0f2ea] text-[#286d60]">
                <FolderPlus size={20} />
              </span>
              <div>
                <h2 className="font-bold text-[#29465a]">Kategori ekle</h2>
                <p className="text-xs text-[#71838b]">
                  Üst kategori seçerek iç içe yapı kurun.
                </p>
              </div>
            </div>
            {isAdmin ? (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 rounded-xl bg-[#f2f5ef] p-1">
                  <button
                    onClick={() => {
                      setCategoryMode("education");
                      setCategoryParentId("root");
                    }}
                    className={`rounded-lg px-3 py-2 text-xs font-bold ${categoryMode === "education" ? "bg-white text-[#23435a] shadow-sm" : "text-[#74848a]"}`}
                  >
                    Eğitim
                  </button>
                  <button
                    onClick={() => {
                      setCategoryMode("institution");
                      setCategoryParentId("root");
                    }}
                    className={`rounded-lg px-3 py-2 text-xs font-bold ${categoryMode === "institution" ? "bg-white text-[#23435a] shadow-sm" : "text-[#74848a]"}`}
                  >
                    Kurum
                  </button>
                </div>
                <div className="space-y-2">
                  <Label>Üst kategori</Label>
                  <select
                    value={categoryParentId}
                    onChange={event => setCategoryParentId(event.target.value)}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="root">
                      {categoryMode === "education"
                        ? "Yeni Ana Grup"
                        : "Yeni Kurum Kategorisi"}
                    </option>
                    {availableParents.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[#839096]">
                    Oluşacak düzey: {categoryLevelLabel}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoryName">Kategori adı</Label>
                  <Input
                    id="categoryName"
                    value={categoryName}
                    onChange={e => setCategoryName(e.target.value)}
                    placeholder={
                      categoryMode === "education"
                        ? "Örn. İlkokul"
                        : "Örn. KPSS"
                    }
                    className="h-11 rounded-xl"
                  />
                </div>
                <Button
                  disabled={
                    !categoryName.trim() ||
                    createCategory.isPending ||
                    (categoryMode === "education" &&
                      Boolean(
                        selectedParent && selectedParent.level === "outcome"
                      ))
                  }
                  onClick={() =>
                    createCategory.mutate({
                      name: categoryName,
                      categoryType: categoryMode,
                      level: categoryLevel,
                      parentId:
                        categoryParentId === "root"
                          ? undefined
                          : Number(categoryParentId),
                    })
                  }
                  className="w-full rounded-xl bg-[#18344f]"
                >
                  {createCategory.isPending
                    ? "Kaydediliyor..."
                    : "Kategori oluştur"}
                  <Plus size={16} />
                </Button>
              </div>
            ) : (
              <RestrictedNotice />
            )}
          </div>
          <div className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
            <p className="text-sm font-bold text-[#29465a]">
              Kategori mimarisi
            </p>
            <p className="mt-1 text-xs leading-5 text-[#71838b]">
              Eğitim için sıra sabittir; Kurum Kategorisi bağımsız bir ağaçtır.
            </p>
            <div className="mt-6 space-y-2">
              {hierarchy.map((name, index) => (
                <div
                  key={name}
                  className="flex items-center gap-4 rounded-xl border border-[#edf0eb] px-4 py-3"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#eef5f0] text-xs font-bold text-[#528374]">
                    {index + 1}
                  </span>
                  <span className="text-sm font-semibold text-[#365368]">
                    {name}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-6 border-t border-[#edf0eb] pt-5">
              <p className="text-xs font-bold tracking-[.14em] text-[#70877e] uppercase">
                Kayıtlı kategoriler
              </p>
              <div className="mt-3 space-y-2">
                {categoryNodes.isLoading ? (
                  <p className="text-sm text-[#7d8c91]">Yükleniyor...</p>
                ) : (categoryNodes.data ?? []).length ? (
                  categoryNodes.data?.map(item => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 rounded-xl bg-[#f7f8f4] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        {editingCategoryId === item.id ? (
                          <div className="flex gap-2">
                            <Input
                              value={editingCategoryName}
                              onChange={event =>
                                setEditingCategoryName(event.target.value)
                              }
                              className="h-9 rounded-lg bg-white text-sm"
                            />
                            <Button
                              size="sm"
                              disabled={
                                editingCategoryName.trim().length < 2 ||
                                updateCategory.isPending
                              }
                              onClick={() =>
                                updateCategory.mutate({
                                  id: item.id,
                                  name: editingCategoryName,
                                })
                              }
                              className="h-9 rounded-lg bg-[#18344f]"
                            >
                              Kaydet
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingCategoryId(null)}
                              className="h-9 rounded-lg"
                            >
                              İptal
                            </Button>
                          </div>
                        ) : (
                          <div className="min-w-0">
                            <span className="truncate text-sm font-semibold text-[#456073]">
                              {item.name}
                            </span>
                            <p className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-[#82918f]">
                              <button type="button" onClick={() => setLocation(`/panel/icerikler?categoryId=${item.id}`)} className="font-bold text-[#5540e8] underline-offset-2 transition hover:text-[#3f2fc1] hover:underline" aria-label={`${item.name} kategorisindeki içerikleri görüntüle`}>
                                {categoryContentCounts.get(item.id) ?? 0} bağlı içerik
                              </button>
                              <span aria-hidden="true">·</span><span>{categoryPath(item, categoryOptions)}</span>
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setLocation(`/panel/icerikler?categoryId=${item.id}`)}
                            className="h-8 rounded-lg text-xs"
                          >
                            İçerikleri gör
                          </Button>
                        )}
                        {editingCategoryId !== item.id && isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingCategoryId(item.id);
                              setEditingCategoryName(item.name);
                            }}
                            className="h-8 rounded-lg text-xs"
                          >
                            Düzenle
                          </Button>
                        )}
                        {item.categoryType === "institution" ? (
                          <>
                            <span
                              className={`text-[10px] font-bold ${item.isActive ? "text-[#4f876e]" : "text-[#9a746b]"}`}
                            >
                              {item.isActive ? "Aktif" : "Pasif"}
                            </span>
                            {isAdmin && (
                              <Switch
                                checked={item.isActive}
                                disabled={
                                  updateInstitutionStatus.isPending ||
                                  updateCategoryStatus.isPending
                                }
                                onCheckedChange={isActive =>
                                  updateInstitutionStatus.mutate({
                                    id: item.id,
                                    isActive,
                                  })
                                }
                              />
                            )}
                          </>
                        ) : (
                          <>
                            <span
                              className={`text-[10px] font-bold ${item.isActive ? "text-[#4f876e]" : "text-[#9a746b]"}`}
                            >
                              {item.isActive ? "Aktif" : "Pasif"}
                            </span>
                            {isAdmin && (
                              <Switch
                                checked={item.isActive}
                                disabled={updateCategoryStatus.isPending}
                                onCheckedChange={isActive =>
                                  updateCategoryStatus.mutate({
                                    id: item.id,
                                    isActive,
                                  })
                                }
                              />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-[#7d8c91]">
                    Henüz kategori bulunmuyor. İlk yapıyı soldaki formdan
                    ekleyin.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {section === "soru-havuzu" && <QuestionEditor isAllowed={isAllowed} />}
      {false && section === "soru-havuzu" && (
        <section className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
          <div className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e0f2ea] text-[#286d60]">
                <Target size={20} />
              </span>
              <div>
                <h2 className="font-bold text-[#29465a]">Yeni soru</h2>
                <p className="text-xs text-[#71838b]">
                  Önce taslak olarak kaydedilir.
                </p>
              </div>
            </div>
            {isAllowed("Soru Havuzu") ? (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Soru türü</Label>
                    <select
                      value={questionType}
                      onChange={event =>
                        setQuestionType(
                          event.target.value as typeof questionType
                        )
                      }
                      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    >
                      <option value="multiple-choice">Çoktan seçmeli</option>
                      <option value="true-false">Doğru - yanlış</option>
                      <option value="open-ended">Açık uçlu</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Zorluk</Label>
                    <select
                      value={questionDifficulty}
                      onChange={event =>
                        setQuestionDifficulty(
                          event.target.value as typeof questionDifficulty
                        )
                      }
                      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    >
                      <option value="easy">Kolay</option>
                      <option value="medium">Orta</option>
                      <option value="hard">Zor</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <select
                    value={questionCategoryId}
                    onChange={event =>
                      setQuestionCategoryId(event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Eğitim veya Kurum kategorisi seçin</option>
                    {(categoryNodes.data ?? [])
                      .filter(item =>
                        item.categoryType === "institution"
                          ? item.isActive
                          : true
                      )
                      .map(item => (
                        <option key={item.id} value={item.id}>
                          {item.categoryType === "education"
                            ? "Eğitim"
                            : "Kurum"}{" "}
                          · {item.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="questionPrompt">Soru metni</Label>
                  <Textarea
                    id="questionPrompt"
                    value={questionPrompt}
                    onChange={event => setQuestionPrompt(event.target.value)}
                    placeholder="Örn. Metindeki ana fikri belirleyiniz."
                    className="min-h-30 rounded-xl"
                  />
                </div>
                <Button
                  disabled={
                    questionPrompt.trim().length < 12 ||
                    !questionCategoryId ||
                    createQuestion.isPending
                  }
                  onClick={() =>
                    createQuestion.mutate({
                      questionType,
                      prompt: questionPrompt,
                      difficulty: questionDifficulty,
                      categoryId: Number(questionCategoryId),
                    })
                  }
                  className="w-full rounded-xl bg-[#18344f]"
                >
                  {createQuestion.isPending
                    ? "Kaydediliyor..."
                    : "Taslak soru ekle"}
                  <Plus size={16} />
                </Button>
              </div>
            ) : (
              <RestrictedNotice />
            )}
          </div>
          <div className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-[#29465a]">Soru havuzu</h2>
                <p className="mt-1 text-xs text-[#71838b]">
                  Son eklenen taslaklar
                </p>
              </div>
              <Badge className="border-0 bg-[#edf4ef] text-[#548073] hover:bg-[#edf4ef]">
                {questions.data?.length ?? 0} soru
              </Badge>
            </div>
            <div className="mt-5 space-y-3">
              {questions.isLoading ? (
                <div className="rounded-xl bg-[#f7f8f4] p-5 text-sm text-[#728087]">
                  Sorular yükleniyor...
                </div>
              ) : (questions.data ?? []).length ? (
                questions.data?.map(item => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[#eef0eb] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-semibold text-[#3b586a]">
                        {item.prompt}
                      </p>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {item.status === "approved" ? "Onaylı" : "Taslak"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-[#819095]">
                      {item.questionType === "multiple-choice"
                        ? "Çoktan seçmeli"
                        : item.questionType === "true-false"
                          ? "Doğru - yanlış"
                          : "Açık uçlu"}{" "}
                      ·{" "}
                      {item.difficulty === "easy"
                        ? "Kolay"
                        : item.difficulty === "hard"
                          ? "Zor"
                          : "Orta"}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-[#f7f8f4] p-5 text-sm leading-6 text-[#728087]">
                  Henüz soru bulunmuyor. Soldaki formdan veya AI Oluşturucu
                  alanından ilk soru taslağını ekleyebilirsiniz.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {section === "ai" && (
        <section className="space-y-5">
          <div className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-[#29465a]">AI sağlayıcı bağlantıları</h2>
                <p className="mt-1 text-xs leading-5 text-[#71838b]">API anahtarları sunucuda tutulur; burada yalnızca durum ve maskeli bilgi gösterilir.</p>
              </div>
              <Badge variant="outline">Anahtarlar sonra eklenebilir</Badge>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(["openai", "gemini"] as const).map(provider => {
                const status = aiProviderStatus.data?.[provider];
                const model = provider === "openai" ? "gpt-5-mini" : "gemini-3-flash-preview";
                return <div key={provider} className="rounded-2xl border border-[#edf0ea] bg-[#fafcf9] p-4">
                  <div className="flex items-center justify-between gap-2"><p className="font-semibold text-[#3b586a]">{provider === "openai" ? "ChatGPT / OpenAI" : "Google Gemini"}</p><span className={`text-xs font-semibold ${status?.configured ? "text-[#4b806d]" : "text-[#a27b46]"}`}>{status?.configured ? "Hazır" : "Anahtar bekleniyor"}</span></div>
                  <p className="mt-2 text-xs text-[#819095]">{status?.maskedKey || "API key henüz eklenmedi"}</p>
                  <Button variant="outline" size="sm" className="mt-3 rounded-xl" disabled={testAiProviderConnection.isPending} onClick={() => testAiProviderConnection.mutate({ provider, model })}>Bağlantıyı test et</Button>
                </div>;
              })}
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
          <div className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8e4f7] text-[#68558e]">
                <BrainCircuit size={20} />
              </span>
              <div>
                <h2 className="font-bold text-[#29465a]">
                  AI ile soru oluştur
                </h2>
                <p className="text-xs text-[#71838b]">
                  Soru önce taslak olarak kaydedilir.
                </p>
              </div>
            </div>
            {isAllowed("Soru Havuzu") ? (
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="aiTopic">Konu veya kazanım</Label>
                  <Input
                    id="aiTopic"
                    value={aiTopic}
                    onChange={event => setAiTopic(event.target.value)}
                    placeholder="Örn. 1. sınıf Türkçe: heceleme"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>AI sağlayıcısı</Label>
                    <select value={aiProvider} onChange={event => { const next = event.target.value as typeof aiProvider; setAiProvider(next); setAiModel(next === "gemini" ? "gemini-3-flash-preview" : "gpt-5-mini"); }} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
                      <option value="openai">ChatGPT / OpenAI</option>
                      <option value="gemini">Google Gemini</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <div className="flex gap-2">
                      <select value={aiModel} onChange={event => setAiModel(event.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm">
                        {(dynamicAiModels?.data?.models?.length ? dynamicAiModels.data.models : (aiProvider === "openai" ? [{ id: "gpt-5-mini", displayName: "GPT-5 Mini · fallback", generationCompatible: true }, { id: "gpt-5", displayName: "GPT-5 · fallback", generationCompatible: true }] : [{ id: "gemini-3-flash-preview", displayName: "Gemini 3 Flash · fallback", generationCompatible: true }, { id: "gemini-3.1-pro-preview", displayName: "Gemini 3.1 Pro · fallback", generationCompatible: true }])).map((model: { id: string; displayName?: string; generationCompatible?: boolean }) => <option key={model.id} value={model.id} disabled={model.generationCompatible === false}>{model.displayName ?? model.id}{model.generationCompatible === false ? " · üretim uyumsuz" : ""}</option>)}
                      </select>
                      <Button type="button" size="sm" variant="outline" onClick={() => void dynamicAiModels?.refetch?.()} disabled={dynamicAiModels?.isFetching} className="h-11 shrink-0 rounded-xl border-[#cfc4e8] text-[#68558e]">{dynamicAiModels?.isFetching ? "..." : "Yenile"}</Button>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{dynamicAiModels?.data?.source === "remote" ? "Sağlayıcıdan güncel liste" : "API anahtarı sonrası güncel liste alınır; şu an güvenli fallback gösteriliyor."}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Soru türü</Label>
                    <select
                      value={questionType}
                      onChange={event =>
                        setQuestionType(
                          event.target.value as typeof questionType
                        )
                      }
                      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    >
                      <option value="multiple-choice">Çoktan seçmeli</option>
                      <option value="true-false">Doğru - yanlış</option>
                      <option value="open-ended">Açık uçlu</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Zorluk</Label>
                    <select
                      value={questionDifficulty}
                      onChange={event =>
                        setQuestionDifficulty(
                          event.target.value as typeof questionDifficulty
                        )
                      }
                      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    >
                      <option value="easy">Kolay</option>
                      <option value="medium">Orta</option>
                      <option value="hard">Zor</option>
                    </select>
                  </div>
                </div>
                <Button
                  disabled={aiTopic.trim().length < 3 || !questionCategoryId || aiQuestion.isPending}
                  onClick={() =>
                    aiQuestion.mutate({
                      topic: aiTopic,
                      questionType,
                      difficulty: questionDifficulty,
                      categoryId: Number(questionCategoryId),
                      provider: aiProvider,
                      model: aiModel,
                    })
                  }
                  className="w-full rounded-xl bg-[#18344f]"
                >
                  {aiQuestion.isPending
                    ? "Soru üretiliyor..."
                    : "AI ile taslak üret"}
                  <Sparkles size={16} />
                </Button>
                {aiDraft && (
                  <div className="rounded-2xl border border-[#dfe8df] bg-[#f8fbf7] p-4 text-[#29465a]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold">Üretim ön izlemesi</p>
                      <Badge className="border-0 bg-[#e7f1eb] text-[#477767]">Taslak</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6">{aiDraft.prompt}</p>
                    {aiDraft.options.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{aiDraft.options.map((option, index) => <div key={`${option}-${index}`} className="rounded-xl bg-white px-3 py-2 text-xs">{String.fromCharCode(65 + index)}. {option}</div>)}</div>}
                    <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs"><strong>Cevap:</strong> {aiDraft.answer}</div>
                    <p className="mt-3 text-xs leading-5 text-[#71838b]">{aiDraft.explanation}</p>
                    <p className="mt-3 text-[11px] text-[#8a9999]">Taslak doğrudan yayınlanmaz; düzenleyip soru havuzuna kaydetme adımı izlenmelidir.</p>
                  </div>
                )}
              </div>
            ) : (
              <RestrictedNotice />
            )}
          </div>
          <div className="rounded-[24px] bg-[#18344f] p-6 text-white">
            <p className="text-xs font-bold tracking-[.16em] text-[#a5cac0] uppercase">
              Güvenli iş akışı
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-.04em]">
              Üretilen soru doğrudan yayınlanmaz.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#c8d4d6]">
              Yapay zekâ çıktısı önce Soru Havuzu'na taslak olarak eklenir.
              Admin, Öğretmen veya Moderatör gerekli denetimden sonra kullanıma
              alabilir.
            </p>
            <div className="mt-7 space-y-3">
              {[
                "Konu ve türü belirle",
                "Yapılandırılmış taslak üret",
                "Soru havuzunda kontrol et",
                "Onay sonrası testte kullan",
              ].map((item, index) => (
                <div
                  className="flex items-center gap-3 rounded-xl bg-white/9 px-4 py-3 text-sm font-semibold"
                  key={item}
                >
                  <span className="text-[#f3d07b]">0{index + 1}</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
          </div>
        </section>
      )}

      {section === "icerikler" && requestedSection !== "testler" && (
        <section className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
          <div className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e0ebf5] text-[#3b6987]">
                <BookOpenCheck size={20} />
              </span>
              <div>
                <h2 className="font-bold text-[#29465a]">Yeni içerik</h2>
                <p className="text-xs text-[#71838b]">
                  İçerik türünü seçerek taslak oluşturun.
                </p>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>İçerik türü</Label>
                <select
                  value={selectedContentType}
                  disabled={Boolean(panelContentTypeByRoute[requestedSection])}
                  onChange={event =>
                    setContentType(event.target.value as typeof contentType)
                  }
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="test">Testler</option>
                  <option value="document">Dokümanlar</option>
                  <option value="simulation">Simülasyonlar</option>
                  <option value="video">Videolar</option>
                  <option value="game">Oyunlar</option>
                  <option value="news">Haberler</option>
                </select>
              </div>
              <CategoryCascadeSelect
                nodes={categoryOptions}
                educationValue={contentCategoryId}
                institutionValue={contentInstitutionCategoryId}
                onEducationChange={setContentCategoryId}
                onInstitutionChange={setContentInstitutionCategoryId}
              />
              <div className="space-y-2">
                <Label htmlFor="contentTitle">Başlık</Label>
                <Input
                  id="contentTitle"
                  value={contentTitle}
                  onChange={event => setContentTitle(event.target.value)}
                  placeholder="İçeriğin başlığı"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contentSummary">Kısa açıklama</Label>
                <Textarea
                  id="contentSummary"
                  value={contentSummary}
                  onChange={event => setContentSummary(event.target.value)}
                  placeholder="İçeriğin ne sunduğunu açıklayın."
                  className="min-h-25 rounded-xl"
                />
              </div>
              {selectedContentType === "document" && <div className="space-y-2 rounded-xl border border-[#e4ebe4] bg-[#fbfdf9] p-3">
                <Label htmlFor="documentCoverSource">PDF’den otomatik kapak oluştur</Label>
                <p className="text-[11px] leading-5 text-[#71838b]">PDF’nin ilk sayfası 900×1200 WebP kapak görseline dönüştürülür ve S3’e kaydedilir.</p>
                <input id="documentCoverSource" type="file" accept="application/pdf" disabled={documentUpload.isPending} onChange={event => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { const dataBase64 = String(reader.result).split(",")[1] ?? ""; documentUpload.mutate({ fileName: file.name, mimeType: "application/pdf", dataBase64, contentType: "document" }); }; reader.readAsDataURL(file); event.currentTarget.value = ""; }} className="block w-full rounded-xl border border-input bg-white p-2 text-xs" />
                {documentUpload.isPending && <p className="text-xs text-[#4e7c6d]">Doküman yükleniyor, kapak hazırlanıyor...</p>}
              </div>}
              <div className="space-y-2">
                <Label htmlFor="contentCoverUrl">Kapak görseli URL’si <span className="font-normal">(manuel değiştirme)</span></Label>
                <Input
                  id="contentCoverUrl"
                  value={contentCoverUrl}
                  onChange={event => setContentCoverUrl(event.target.value)}
                  placeholder="Otomatik veya https://... kapak URL’si"
                  className="h-11 rounded-xl"
                />
                {contentCoverUrl && <img src={contentCoverUrl} alt="Otomatik kapak ön izlemesi" className="h-40 w-32 rounded-xl border border-[#e6ebe5] object-cover" />}
              </div>
              <Button
                disabled={
                  contentTitle.trim().length < 3 ||
                  !contentCategoryId ||
                  createContent.isPending
                }
                onClick={() =>
                  createContent.mutate({
                    title: contentTitle,
                    contentType: selectedContentType,
                    summary: contentSummary,
                    coverImageUrl: contentCoverUrl.trim() || undefined,
                    categoryId: Number(contentCategoryId),
                    institutionCategoryId: contentInstitutionCategoryId ? Number(contentInstitutionCategoryId) : null,
                  })
                }
                className="w-full rounded-xl bg-[#18344f]"
              >
                {createContent.isPending
                  ? "Kaydediliyor..."
                  : "İçerik taslağı oluştur"}
                <Plus size={16} />
              </Button>
            </div>
          </div>
          <div className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
            <p className="text-sm font-bold text-[#29465a]">İçerik ilkeleri</p>
            <div className="mt-5 space-y-3">
              {[
                ["Testler", "Soru havuzundaki onaylı sorularla bağlanır."],
                [
                  "Dokümanlar",
                  "S3 bulut depolama alanına yüklenen dosyalarla ilişkilendirilir.",
                ],
                [
                  "Videolar",
                  "Güvenli video bağlantısı veya dosya ile sunulur.",
                ],
                ["Simülasyonlar", "Eğitim veya kurum kategorisiyle yayınlanır."],
                ["Oyunlar", "Eğitim veya kurum kategorisiyle yayınlanır."],
                ["Sorular", "Soru havuzunda zorunlu kategoriyle saklanır."],
                ["Soru-Cevap", "Üyelerin katkıları moderasyon sonrası yayınlanır."],
              ].map(([name, text]) => (
                <div key={name} className="rounded-xl bg-[#f7f8f4] p-4">
                  <p className="text-sm font-bold text-[#496374]">{name}</p>
                  <p className="mt-1 text-xs leading-5 text-[#77878d]">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {requestedSection === "testler" && (
        <section className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
          <div className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
            <p className="text-xs font-bold tracking-[.16em] text-[#7b928f] uppercase">
              Test oluşturucu
            </p>
            <h2 className="mt-2 text-xl font-bold text-[#29465a]">
              Soru havuzundan test taslağı oluşturun.
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#71838b]">
              En az bir soru seçerek yeni bir test kaydı oluşturabilirsiniz.
            </p>
            {isAllowed("Testler") ? (
              <div className="mt-6 space-y-4">
                <Input
                  value={testTitle}
                  onChange={event => setTestTitle(event.target.value)}
                  placeholder="Test başlığı"
                  className="h-11 rounded-xl"
                />
                <Input
                  value={testCoverUrl}
                  onChange={event => setTestCoverUrl(event.target.value)}
                  placeholder="Kapak görseli URL’si"
                  className="h-11 rounded-xl"
                />
                <CategoryCascadeSelect
                  nodes={categoryOptions}
                  educationValue={testCategoryId}
                  institutionValue={testInstitutionCategoryId}
                  onEducationChange={setTestCategoryId}
                  onInstitutionChange={setTestInstitutionCategoryId}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="number"
                    min="1"
                    max="240"
                    value={testDurationMinutes}
                    onChange={event =>
                      setTestDurationMinutes(event.target.value)
                    }
                    placeholder="Süre (dakika)"
                    className="h-11 rounded-xl"
                  />
                  <Input
                    value={testDescription}
                    onChange={event => setTestDescription(event.target.value)}
                    placeholder="Kısa açıklama"
                    className="h-11 rounded-xl"
                  />
                </div>
                <Textarea
                  value={testDescription}
                  onChange={event => setTestDescription(event.target.value)}
                  placeholder="Kısa açıklama"
                  className="min-h-24 rounded-xl"
                />
                <div className="max-h-56 space-y-2 overflow-auto rounded-xl bg-[#f7f8f4] p-3">
                  {questions.isLoading ? (
                    <p className="p-2 text-sm text-[#71838b]">
                      Sorular yükleniyor...
                    </p>
                  ) : questions.isError ? (
                    <p className="p-2 text-sm text-[#a65345]">
                      Sorular yüklenemedi.
                    </p>
                  ) : (questions.data ?? []).length ? (
                    questions.data?.map(question => (
                      <label
                        key={question.id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3"
                      >
                        <input
                          type="checkbox"
                          checked={testQuestionIds.includes(question.id)}
                          onChange={event =>
                            setTestQuestionIds(current =>
                              event.target.checked
                                ? [...current, question.id]
                                : current.filter(id => id !== question.id)
                            )
                          }
                          className="mt-1"
                        />
                        <span className="text-sm text-[#365368]">
                          {question.prompt}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="p-2 text-sm text-[#71838b]">
                      Test oluşturmak için önce soru havuzuna soru ekleyin.
                    </p>
                  )}
                </div>
                <Button
                  disabled={
                    testTitle.trim().length < 3 ||
                    !testCategoryId ||
                    testQuestionIds.length === 0 ||
                    createTest.isPending
                  }
                  onClick={() =>
                    createTest.mutate({
                      title: testTitle.trim(),
                      description: testDescription.trim() || undefined,
                      coverImageUrl: testCoverUrl.trim() || undefined,
                      durationMinutes: Number(testDurationMinutes) || 20,
                      categoryId: Number(testCategoryId),
                      institutionCategoryId: testInstitutionCategoryId ? Number(testInstitutionCategoryId) : null,
                      questionIds: testQuestionIds,
                    })
                  }
                  className="w-full rounded-xl bg-[#18344f]"
                >
                  {createTest.isPending
                    ? "Kaydediliyor..."
                    : "Test taslağı oluştur"}
                  <Plus size={16} />
                </Button>
              </div>
            ) : (
              <RestrictedNotice />
            )}
          </div>
          <div className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-[.16em] text-[#7b928f] uppercase">
                  Test arşivi
                </p>
                <h2 className="mt-2 text-xl font-bold text-[#29465a]">
                  Oluşturulan testler
                </h2>
              </div>
              <Badge variant="outline">{testList.data?.length ?? 0} test</Badge>
            </div>
            {false && isAdmin && (
              <div className="mt-5 rounded-2xl bg-[#f7f8f4] p-4">
                <p className="text-sm font-bold text-[#29465a]">Medya Merkezi bağlantısı</p>
                <p className="mt-1 text-xs text-[#71838b]">
                  Test ve Medya Merkezi’ndeki varlık ID’lerini girerek dosya
                  ilişkilendirin.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <Input
                    value={linkTargetId}
                    onChange={event => setLinkTargetId(event.target.value)}
                    placeholder="Test ID"
                    className="h-10 rounded-xl bg-white"
                  />
                  <Input
                    value={linkMediaId}
                    onChange={event => setLinkMediaId(event.target.value)}
                    placeholder="Medya ID"
                    className="h-10 rounded-xl bg-white"
                  />
                  <Input
                    value={linkRole}
                    onChange={event => setLinkRole(event.target.value)}
                    placeholder="Rol (attachment)"
                    className="h-10 rounded-xl bg-white"
                  />
                  <Button
                    disabled={
                      !linkTargetId || !linkMediaId || linkMediaAsset.isPending
                    }
                    onClick={() =>
                      linkMediaAsset.mutate({
                        mediaAssetId: Number(linkMediaId),
                        targetType: "test",
                        targetId: Number(linkTargetId),
                        role: linkRole || "attachment",
                      })
                    }
                    className="h-10 rounded-xl bg-[#18344f]"
                  >
                    {linkMediaAsset.isPending ? "Bağlanıyor..." : "Bağla"}
                  </Button>
                </div>
              </div>
            )}
            {Number(linkTargetId) > 0 && (
              <div className="mt-3 rounded-xl border border-[#e7ece7] bg-white p-3">
                <p className="text-xs font-bold text-[#365368]">
                  Bu kayda bağlı medya
                </p>
                {linkedMedia.isLoading ? (
                  <p className="mt-2 text-xs text-[#7b8b90]">
                    Bağlı medya yükleniyor...
                  </p>
                ) : linkedMedia.isError ? (
                  <p className="mt-2 text-xs text-[#a65345]">
                    Bağlı medya listesi yüklenemedi.
                  </p>
                ) : (linkedMedia.data ?? []).length ? (
                  <div className="mt-2 space-y-2">
                    {linkedMedia.data?.map(link => {
                      const asset = mediaAssets.data?.find(
                        item => item.id === link.mediaAssetId
                      );
                      return (
                        <div
                          key={link.id}
                          className="flex items-center justify-between gap-3 rounded-lg bg-[#f7f8f4] px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-[#365368]">
                              {asset?.fileName ?? `Medya #${link.mediaAssetId}`}
                            </p>
                            <p className="text-[11px] text-[#7b8b90]">
                              {asset?.provider
                                ? (providerLabel[asset.provider] ??
                                  asset.provider)
                                : "Medya varlığı"}{" "}
                              · {link.role ?? "attachment"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={unlinkMediaAsset.isPending}
                            onClick={() =>
                              unlinkMediaAsset.mutate({ id: link.id })
                            }
                            className="shrink-0 rounded-lg text-xs"
                          >
                            {unlinkMediaAsset.isPending
                              ? "Kaldırılıyor..."
                              : "Bağlantıyı kaldır"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-[#7b8b90]">
                    Bu kayda bağlı medya yok.
                  </p>
                )}
              </div>
            )}
            <div className="mt-6 space-y-3">
              {testList.isLoading ? (
                <div className="rounded-xl bg-[#f7f8f4] p-5 text-sm text-[#71838b]">
                  Testler yükleniyor...
                </div>
              ) : testList.isError ? (
                <div className="rounded-xl bg-[#fff3ef] p-5 text-sm text-[#a65345]">
                  Testler yüklenemedi.
                </div>
              ) : (testList.data ?? []).length ? (
                testList.data?.map(test => (
                  <div
                    key={test.id}
                    className="rounded-xl border border-[#eef0eb] px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[#365368]">
                          {test.title}
                        </p>
                        <p className="mt-1 text-xs text-[#7b8b90]">
                          {test.description || "Açıklama eklenmedi."} ·{" "}
                          {Array.isArray(test.questionIds)
                            ? test.questionIds.length
                            : 0}{" "}
                          soru
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {test.status === "published"
                          ? "Yayında"
                          : test.status === "archived"
                            ? "Arşiv"
                            : "Taslak"}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-[#f7f8f4] p-5 text-sm leading-6 text-[#71838b]">
                  Henüz test bulunmuyor.
                </div>
              )}
            </div>
          </div>
        </section>
      )}
      {section === "icerikler" && requestedCategoryId && (
        <section className="mb-6 rounded-[24px] border border-[#e6e6de] bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-[#7b928f]">Kategori içerik tablosu</p>
              <h2 className="mt-2 text-xl font-bold text-[#29465a]">Seçilen kategoriye bağlı içerikler</h2>
              <p className="mt-2 text-sm leading-6 text-[#71838b]">Bu kategoriye ait tüm içerik türlerini tek tabloda yönetin.</p>
            </div>
            <Badge variant="outline" className="shrink-0">{categoryContentList.data?.length ?? 0} içerik</Badge>
          </div>
          {categoryContentList.isLoading ? <div className="mt-5 rounded-xl bg-[#f7f8f4] p-4 text-sm text-[#728087]">Kategori içerikleri yükleniyor…</div> : categoryContentList.isError ? <div className="mt-5 rounded-xl bg-[#fff3ef] p-4 text-sm text-[#a65345]">Kategori içerikleri yüklenemedi.</div> : categoryContentList.data?.length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-[#e8eee9] text-xs uppercase tracking-[.12em] text-[#82918f]"><th className="px-3 py-3">Başlık</th><th className="px-3 py-3">Tür</th><th className="px-3 py-3">Durum</th><th className="px-3 py-3">İşlem</th></tr></thead><tbody>{categoryContentList.data.map(item => <tr key={item.id} className="border-b border-[#f0f3ef] last:border-0"><td className="px-3 py-3 font-semibold text-[#365368]">{item.title}</td><td className="px-3 py-3 text-[#728087]">{panelContentTypeLabels[item.contentType]}</td><td className="px-3 py-3"><Badge variant="outline">{item.status}</Badge></td><td className="px-3 py-3"><Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={() => setLocation(`/icerik/${item.contentType}/${item.id}`)}>Detayı aç</Button></td></tr>)}</tbody></table></div> : <div className="mt-5 rounded-xl bg-[#f7f8f4] p-4 text-sm text-[#728087]">Bu kategoride bağlı içerik bulunmuyor.</div>}
        </section>
      )}
      {section === "icerikler" && (
        <section className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[.16em] text-[#7b928f] uppercase">
                {panelContentTypeLabels[selectedContentType]} kayıtları
              </p>
              <h2 className="mt-2 text-xl font-bold text-[#29465a]">
                Bu modülün içerik arşivi
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#71838b]">
                Oluşturulan taslakları bu modüle özel olarak görüntüleyin.
              </p>
            </div>
            <Badge variant="outline" className="shrink-0">
              {contentList.data?.length ?? 0} kayıt
            </Badge>
          </div>
          {false && isAdmin && (
            <div className="mt-5 rounded-2xl bg-[#f7f8f4] p-4">
              <p className="text-sm font-bold text-[#29465a]">Medya Merkezi bağlantısı</p>
              <p className="mt-1 text-xs text-[#71838b]">
                İçerik kaydı ve Medya Merkezi’ndeki varlık ID’lerini girerek
                dosya ilişkilendirin.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <Input
                  value={linkTargetId}
                  onChange={event => setLinkTargetId(event.target.value)}
                  placeholder="İçerik ID"
                  className="h-10 rounded-xl bg-white"
                />
                <Input
                  value={linkMediaId}
                  onChange={event => setLinkMediaId(event.target.value)}
                  placeholder="Medya ID"
                  className="h-10 rounded-xl bg-white"
                />
                <Input
                  value={linkRole}
                  onChange={event => setLinkRole(event.target.value)}
                  placeholder="Rol (attachment)"
                  className="h-10 rounded-xl bg-white"
                />
                <Button
                  disabled={
                    !linkTargetId || !linkMediaId || linkMediaAsset.isPending
                  }
                  onClick={() =>
                    linkMediaAsset.mutate({
                      mediaAssetId: Number(linkMediaId),
                      targetType: "content",
                      targetId: Number(linkTargetId),
                      role: linkRole || "attachment",
                    })
                  }
                  className="h-10 rounded-xl bg-[#18344f]"
                >
                  {linkMediaAsset.isPending ? "Bağlanıyor..." : "Bağla"}
                </Button>
              </div>
            </div>
          )}
          {Number(linkTargetId) > 0 && (
            <div className="mt-3 rounded-xl border border-[#e7ece7] bg-white p-3">
              <p className="text-xs font-bold text-[#365368]">
                Bu kayda bağlı medya
              </p>
              {linkedMedia.isLoading ? (
                <p className="mt-2 text-xs text-[#7b8b90]">
                  Bağlı medya yükleniyor...
                </p>
              ) : linkedMedia.isError ? (
                <p className="mt-2 text-xs text-[#a65345]">
                  Bağlı medya listesi yüklenemedi.
                </p>
              ) : (linkedMedia.data ?? []).length ? (
                <div className="mt-2 space-y-2">
                  {linkedMedia.data?.map(link => {
                    const asset = mediaAssets.data?.find(
                      item => item.id === link.mediaAssetId
                    );
                    return (
                      <div
                        key={link.id}
                        className="flex items-center justify-between gap-3 rounded-lg bg-[#f7f8f4] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-[#365368]">
                            {asset?.fileName ?? `Medya #${link.mediaAssetId}`}
                          </p>
                          <p className="text-[11px] text-[#7b8b90]">
                            {asset?.provider
                              ? (providerLabel[asset.provider] ??
                                asset.provider)
                              : "Medya varlığı"}{" "}
                            · {link.role ?? "attachment"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={unlinkMediaAsset.isPending}
                          onClick={() =>
                            unlinkMediaAsset.mutate({ id: link.id })
                          }
                          className="shrink-0 rounded-lg text-xs"
                        >
                          {unlinkMediaAsset.isPending
                            ? "Kaldırılıyor..."
                            : "Bağlantıyı kaldır"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 text-xs text-[#7b8b90]">
                  Bu kayda bağlı medya yok.
                </p>
              )}
            </div>
          )}
          <div className="mt-6 space-y-3">
            {contentList.isLoading ? (
              <div className="rounded-xl bg-[#f7f8f4] p-5 text-sm text-[#728087]">
                {panelContentTypeLabels[selectedContentType]} kayıtları
                yükleniyor...
              </div>
            ) : contentList.isError ? (
              <div className="rounded-xl bg-[#fff3ef] p-5 text-sm text-[#a65345]">
                Kayıtlar yüklenemedi. Lütfen tekrar deneyin.
              </div>
            ) : (contentList.data ?? []).length ? (
              contentList.data?.map(item => (
                <div
                  key={item.id}
                  className="rounded-xl border border-[#eef0eb] px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#365368]">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-[#7b8b90]">
                        {item.summary || "Açıklama eklenmedi."}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {item.status === "published"
                          ? "Yayında"
                          : item.status === "archived"
                            ? "Arşiv"
                            : "Taslak"}
                      </Badge>
                      {item.status !== "archived" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg text-xs"
                          disabled={archiveContent.isPending}
                          onClick={() =>
                            archiveContent.mutate({
                              id: item.id,
                              contentType: selectedContentType,
                            })
                          }
                        >
                          Arşivle
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-[#f7f8f4] p-5 text-sm leading-6 text-[#728087]">
                Bu modülde henüz kayıt bulunmuyor. Yukarıdaki formdan ilk
                taslağı oluşturabilirsiniz.
              </div>
            )}
          </div>
        </section>
      )}

      {section === "icerikler" && requestedSection === "videolar" && (
        <div className="mb-5">
          <AdminOnlyIntegrationSection
            title="YouTube ve Video Kaynakları"
            description="Video içerikleri için YouTube kanal bilgilerini veya doğrudan video/embed sağlayıcısını güvenli biçimde test edin."
            providers={["YouTube Video", "Video URL / Embed"]}
            isAdmin={isAdmin}
            settings={adminSettings}
            testProviderConnection={testProviderConnection}
            storageConfig={cloudStorageConfig}
            setStorageConfig={setCloudStorageConfig}
          />
        </div>
      )}

      {section === "icerikler" && requestedSection === "haberler" && (
        <section className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
          <h2 className="text-xl font-bold text-[#29465a]">
            Haber kategorileri
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#71838b]">
            Haberler için bağımsız kategoriler oluşturun ve içerik düzenini
            koruyun.
          </p>
          {isAdmin ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
              <div className="flex gap-2">
                <Input
                  value={newsCategoryName}
                  onChange={event => setNewsCategoryName(event.target.value)}
                  placeholder="Örn. Eğitim gündemi"
                  className="h-11 rounded-xl"
                />
                <Button
                  disabled={
                    newsCategoryName.trim().length < 2 ||
                    createNewsCategory.isPending
                  }
                  onClick={() =>
                    createNewsCategory.mutate({ name: newsCategoryName })
                  }
                  className="rounded-xl bg-[#18344f]"
                >
                  Ekle
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(newsCategories.data ?? []).length ? (
                  newsCategories.data?.map(item => (
                    <Badge
                      key={item.id}
                      variant="outline"
                      className="px-3 py-1.5"
                    >
                      {item.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-[#7b8b90]">
                    Henüz haber kategorisi eklenmedi.
                  </span>
                )}
              </div>
            </div>
          ) : (
            <RestrictedNotice />
          )}
        </section>
      )}

      {section === "ayarlar" && (
        <section className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
          <h2 className="text-xl font-bold text-[#29465a]">Panel izinleri</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#71838b]">
            Admin, Öğretmen ve Moderatör panellerinde hangi bölümlerin
            görüntüleneceğini rol bazında açıp kapatır. Bu izinler tek tek
            kullanıcıya değil, seçilen role uygulanır.
          </p>
          {isAdmin ? (
            <>
              <div className="mt-6 flex gap-2">
                <Button
                  onClick={() => setPermissionRole("teacher")}
                  variant={permissionRole === "teacher" ? "default" : "outline"}
                  className={
                    permissionRole === "teacher" ? "bg-[#18344f]" : "rounded-xl"
                  }
                >
                  Öğretmen
                </Button>
                <Button
                  onClick={() => setPermissionRole("moderator")}
                  variant={
                    permissionRole === "moderator" ? "default" : "outline"
                  }
                  className={
                    permissionRole === "moderator"
                      ? "bg-[#18344f]"
                      : "rounded-xl"
                  }
                >
                  Moderatör
                </Button>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {managedSections.map(name => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-xl border border-[#edf0eb] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#365368]">
                        {name}
                      </p>
                      <p className="mt-0.5 text-xs text-[#7b8b90]">
                        {permissionRole === "teacher"
                          ? "Öğretmen"
                          : "Moderatör"}{" "}
                        erişimi
                      </p>
                    </div>
                    <Switch
                      checked={activePermissions.get(name) ?? false}
                      disabled={updatePermission.isPending}
                      onCheckedChange={isEnabled =>
                        updatePermission.mutate({
                          role: permissionRole,
                          section: name,
                          isEnabled,
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-xl bg-[#f8f7f2] p-4 text-sm text-[#6f8085]">
              Bu ayarı değiştirmek için Admin rolü gerekir.
            </div>
          )}
        </section>
      )}

      {section === "ayarlar" && (
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
            <h2 className="text-xl font-bold text-[#29465a]">
              SEO ve Google Search Console
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#71838b]">
              Doğrulama etiketi, ölçüm kimliği veya SEO açıklaması gibi
              yapılandırmaları kaydedin. Harici API bağlamak için Google
              yetkilendirmesi ayrıca gereklidir.
            </p>
            <div className="mt-5 space-y-3">
              <Input
                value={settingValue}
                onChange={event => setSettingValue(event.target.value)}
                placeholder="Örn. google-site-verification=..."
                className="h-11 rounded-xl"
              />
              <Button
                disabled={
                  !isAdmin ||
                  settingValue.trim().length < 2 ||
                  saveSetting.isPending
                }
                onClick={() =>
                  saveSetting.mutate({
                    settingKey: "search_console_verification",
                    settingValue,
                  })
                }
                className="w-full rounded-xl bg-[#18344f]"
              >
                {saveSetting.isPending
                  ? "Kaydediliyor..."
                  : "Search Console ayarını kaydet"}
              </Button>
            </div>
          </div>
          <div className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
            <h2 className="text-xl font-bold text-[#29465a]">Reklam Alanı</h2>
            <p className="mt-2 text-sm leading-6 text-[#71838b]">
              Google AdSense ve özel firma reklam kodlarını yayın öncesinde
              buradan yönetin.
            </p>
            <div className="mt-5 space-y-2">
              {[
                "AdSense yayıncı kimliği",
                "Ana sayfa özel firma alanı",
                "İçerik sayfası reklam alanı",
              ].map(item => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-xl bg-[#f7f8f4] px-4 py-3"
                >
                  <span className="text-sm font-semibold text-[#496374]">
                    {item}
                  </span>
                  <Badge variant="outline">Yapılandırılabilir</Badge>
                </div>
              ))}
              <p className="pt-2 text-xs leading-5 text-[#7b8b90]">
                Kaydedilmiş ayar:{" "}
                {adminSettings.data?.some(
                  item => item.settingKey === "search_console_verification"
                )
                  ? "Mevcut"
                  : "Henüz yok"}
              </p>
            </div>
          </div>
        </section>
      )}

      {section === "ayarlar" && (
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
            <h2 className="text-xl font-bold text-[#29465a]">
              Reklam yapılandırması
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#71838b]">
              AdSense yayıncı kimliği ve özel firma HTML alanını yalnızca Admin
              kaydedebilir.
            </p>
            <div className="mt-5 space-y-3">
              <Input
                value={adSensePublisherId}
                onChange={event => setAdSensePublisherId(event.target.value)}
                placeholder="ca-pub-..."
                className="h-11 rounded-xl"
              />
              <Button
                disabled={
                  !isAdmin ||
                  adSensePublisherId.trim().length < 6 ||
                  saveSetting.isPending
                }
                onClick={() =>
                  saveSetting.mutate({
                    settingKey: "adsense_publisher_id",
                    settingValue: adSensePublisherId,
                  })
                }
                className="w-full rounded-xl bg-[#18344f]"
              >
                AdSense kimliğini kaydet
              </Button>
              <Textarea
                value={customAdSnippet}
                onChange={event => setCustomAdSnippet(event.target.value)}
                placeholder="Özel firma reklam HTML kodu veya güvenli iframe URL'si"
                className="min-h-24 rounded-xl"
              />
              <Button
                disabled={
                  !isAdmin ||
                  customAdSnippet.trim().length < 6 ||
                  saveSetting.isPending
                }
                onClick={() =>
                  saveSetting.mutate({
                    settingKey: "custom_home_ad",
                    settingValue: customAdSnippet,
                  })
                }
                variant="outline"
                className="w-full rounded-xl"
              >
                Özel reklam alanını kaydet
              </Button>
            </div>
          </div>
          <div className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
            <h2 className="text-xl font-bold text-[#29465a]">
              Site haritası önizlemesi
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#71838b]">
              Yayınlanabilir içerik URL'leri bu listeden izlenir; yayınlanan
              alan adı eklendiğinde XML haritasına bağlanmaya hazırdır.
            </p>
            <div className="mt-5 max-h-52 space-y-2 overflow-auto">
              {(overview.data?.content ?? []).length ? (
                overview.data?.content.map(item => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-[#f7f8f4] px-3 py-2 text-xs text-[#496374]"
                  >
                    /icerik/{item.slug}
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-[#f7f8f4] p-4 text-sm text-[#7b8b90]">
                  İçerik taslağı eklendikçe site haritası önizlemesi burada
                  oluşur.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {section === "ayarlar" && (
        <section className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
          <div className="mb-8 rounded-2xl border border-[#dfe9e2] bg-[#f6faf6] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#29465a]">
                  Popüler eğitim kategorileri
                </h2>
                <p className="mt-1 text-sm leading-6 text-[#71838b]">
                  Ana sayfada gösterilecek kategorileri seçin ve sıralayın.
                </p>
              </div>
              <Badge className="border-0 bg-[#e6f2ed] text-[#307363]">
                {popularCategoryIds.length} seçili
              </Badge>
            </div>
            {isAdmin ? (
              <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_.9fr]">
                <div className="grid gap-2 sm:grid-cols-2">
                  {popularEducationCategories.data?.available.map(category => {
                    const selected = popularCategoryIds.includes(category.id);
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => togglePopularCategory(category.id)}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${selected ? "border-[#9bcabc] bg-white" : "border-[#e6e9e2] bg-white/60 hover:border-[#c8ddd5]"}`}
                      >
                        <span className="truncate text-sm font-semibold text-[#365368]">
                          {category.name}
                        </span>
                        <span
                          className={`ml-2 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${selected ? "bg-[#2f7668] text-white" : "border border-[#cbd8d1] text-transparent"}`}
                        >
                          ✓
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-xl bg-white p-3">
                  <p className="text-xs font-bold text-[#365368]">
                    Ana sayfa sırası
                  </p>
                  <div className="mt-2 space-y-2">
                    {popularCategoryIds.length ? (
                      popularCategoryIds.map((id, index) => {
                        const category =
                          popularEducationCategories.data?.available.find(
                            item => item.id === id
                          );
                        return (
                          <div
                            key={id}
                            className="flex items-center gap-2 rounded-lg border border-[#e4e8e1] px-2.5 py-2"
                          >
                            <span className="text-xs font-bold text-[#286d60]">
                              {index + 1}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#365368]">
                              {category?.name ?? `Kategori #${id}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => movePopularCategory(index, -1)}
                              disabled={index === 0}
                              className="text-xs disabled:opacity-30"
                              aria-label="Yukarı taşı"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => movePopularCategory(index, 1)}
                              disabled={index === popularCategoryIds.length - 1}
                              className="text-xs disabled:opacity-30"
                              aria-label="Aşağı taşı"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => togglePopularCategory(id)}
                              className="text-xs text-[#a05046]"
                              aria-label="Listeden çıkar"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <p className="py-3 text-xs text-[#7b8b90]">
                        Henüz kategori seçilmedi.
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() =>
                      savePopularEducationCategories.mutate({
                        categoryIds: popularCategoryIds,
                      })
                    }
                    disabled={savePopularEducationCategories.isPending}
                    className="mt-3 w-full rounded-xl bg-[#18344f]"
                  >
                    {savePopularEducationCategories.isPending
                      ? "Kaydediliyor..."
                      : "Kaydet"}
                  </Button>
                </div>
              </div>
            ) : (
              <RestrictedNotice />
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#29465a]">
                Ana sayfa slider
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#71838b]">
                Ana sayfadaki öne çıkan alanları buradan oluşturun. Sıralama
                değeri küçük olan kayıt önce gösterilir; pasif kayıtlar ana
                sayfada görünmez.
              </p>
            </div>
            <Badge className="w-fit border-0 bg-[#e6f2ed] text-[#307363] hover:bg-[#e6f2ed]">
              Admin yönetimi
            </Badge>
          </div>
          {isAdmin ? (
            <div className="mt-6 grid gap-7 lg:grid-cols-[.88fr_1.12fr]">
              <div className="rounded-2xl bg-[#f6f7f2] p-4 sm:p-5">
                <p className="text-sm font-bold text-[#365368]">
                  {editingSlideId
                    ? "Slider kaydını düzenle"
                    : "Yeni slider kaydı"}
                </p>
                <div className="mt-4 space-y-3">
                  <Input
                    value={slideEyebrow}
                    onChange={event => setSlideEyebrow(event.target.value)}
                    placeholder="Üst başlık · Örn. SINAV HAZIRLIĞI"
                    className="h-11 rounded-xl bg-white"
                  />
                  <Input
                    value={slideTitle}
                    onChange={event => setSlideTitle(event.target.value)}
                    placeholder="Başlık"
                    className="h-11 rounded-xl bg-white"
                  />
                  <Textarea
                    value={slideDescription}
                    onChange={event => setSlideDescription(event.target.value)}
                    placeholder="Kısa açıklama"
                    className="min-h-20 rounded-xl bg-white"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      value={slideButtonLabel}
                      onChange={event =>
                        setSlideButtonLabel(event.target.value)
                      }
                      placeholder="Buton metni"
                      className="h-11 rounded-xl bg-white"
                    />
                    <Input
                      value={slideButtonLink}
                      onChange={event => setSlideButtonLink(event.target.value)}
                      placeholder="Bağlantı · /panel"
                      className="h-11 rounded-xl bg-white"
                    />
                  </div>
                  <Input
                    value={slideImageUrl}
                    onChange={event => setSlideImageUrl(event.target.value)}
                    placeholder="Görsel URL'si · isteğe bağlı"
                    className="h-11 rounded-xl bg-white"
                  />
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Label htmlFor="slideSortOrder" className="text-xs">
                        Sıralama
                      </Label>
                      <Input
                        id="slideSortOrder"
                        type="number"
                        min="0"
                        value={slideSortOrder}
                        onChange={event =>
                          setSlideSortOrder(event.target.value)
                        }
                        className="h-10 w-20 rounded-xl bg-white"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label htmlFor="slideActive" className="text-xs">
                        Ana sayfada göster
                      </Label>
                      <Switch
                        id="slideActive"
                        checked={slideIsActive}
                        onCheckedChange={setSlideIsActive}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      disabled={
                        slideTitle.trim().length < 3 ||
                        createHomeSlide.isPending ||
                        updateHomeSlide.isPending
                      }
                      onClick={() =>
                        editingSlideId
                          ? updateHomeSlide.mutate({
                              id: editingSlideId,
                              ...sliderPayload(),
                            })
                          : createHomeSlide.mutate(sliderPayload())
                      }
                      className="flex-1 rounded-xl bg-[#18344f]"
                    >
                      {editingSlideId ? "Güncelle" : "Slider oluştur"}
                    </Button>
                    {editingSlideId && (
                      <Button
                        onClick={resetSlideForm}
                        variant="outline"
                        className="rounded-xl"
                      >
                        Vazgeç
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-[#365368]">
                    Kayıtlı sliderlar
                  </p>
                  <span className="text-xs text-[#7b8b90]">
                    {homeSlides.data?.length ?? 0} kayıt
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {homeSlides.data?.length ? (
                    homeSlides.data.map(slide => (
                      <div
                        key={slide.id}
                        className="overflow-hidden rounded-2xl border border-[#e5e8e1] bg-white"
                      >
                        <div className="flex gap-3 p-3">
                          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#dcebe5] text-xs font-bold text-[#47736a]">
                            {slide.imageUrl ? (
                              <img
                                src={slide.imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              "SLIDER"
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-[#29465a]">
                                  {slide.title}
                                </p>
                                <p className="mt-1 text-xs text-[#77878d]">
                                  Sıra {slide.sortOrder} ·{" "}
                                  {slide.isActive ? "Aktif" : "Pasif"}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className={
                                  slide.isActive
                                    ? "border-[#b9ded1] text-[#317463]"
                                    : "border-[#e2d0c7] text-[#9a6655]"
                                }
                              >
                                {slide.isActive ? "Yayında" : "Pasif"}
                              </Badge>
                            </div>
                            <div className="mt-3 flex gap-2">
                              <Button
                                onClick={() => editSlide(slide)}
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-lg text-xs"
                              >
                                Düzenle
                              </Button>
                              <Button
                                onClick={() =>
                                  deleteHomeSlide.mutate({ id: slide.id })
                                }
                                disabled={deleteHomeSlide.isPending}
                                size="sm"
                                variant="ghost"
                                className="h-8 rounded-lg px-2 text-xs text-[#a05046] hover:bg-[#fff1ed] hover:text-[#a05046]"
                              >
                                Sil
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#cfd8d1] p-7 text-center text-sm leading-6 text-[#7b8b90]">
                      Henüz slider kaydı yok. İlk kaydı oluşturduğunuzda ana
                      sayfa bu içeriği göstermeye başlayacak.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <RestrictedNotice />
          )}
        </section>
      )}

      {section === "uyeler" && (
        <section className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#29465a]">Üye Yönetimi</h2>
              <p className="mt-2 text-sm leading-6 text-[#71838b]">
                Kayıtlı kullanıcıların rol ve son giriş bilgilerini yönetin.
              </p>
            </div>
            <Badge className="border-0 bg-[#edf4ef] text-[#548073]">
              {adminUsers.data?.length ?? 0} kullanıcı
            </Badge>
          </div>
          {isAdmin ? (
            <AdminUsersManagement
              members={adminUsers.data?.map(member => ({
                ...member,
                role: member.role === "user" ? "member" : member.role,
              }))}
              isLoading={adminUsers.isLoading}
              isError={adminUsers.isError}
              isPending={updateUserRole.isPending}
              onRoleChange={input =>
                new Promise<void>(resolve => {
                  updateUserRole.mutate(input, { onSettled: () => resolve() });
                })
              }
            />
          ) : (
            <RestrictedNotice />
          )}
        </section>
      )}

      {section === "istatistikler" && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Kayıtlı üye"
              value={String(adminUsers.data?.length ?? 0)}
              icon={Users}
              tone="bg-[#e0f2ea] text-[#276e61]"
            />
            <StatCard
              label="İçerik taslağı"
              value={String(overview.data?.content.length ?? 0)}
              icon={FileText}
              tone="bg-[#e0eaf5] text-[#386886]"
            />
            <StatCard
              label="Eğitim kategorisi"
              value={String(overview.data?.educationCategories.length ?? 0)}
              icon={FolderTree}
              tone="bg-[#f8edcf] text-[#9c7427]"
            />
            <StatCard
              label="Güvenlik kaydı"
              value={String(securityEvents.data?.length ?? 0)}
              icon={ShieldCheck}
              tone="bg-[#e7e5f8] text-[#62538d]"
            />
          </section>
          <div className="mt-5">
            <AdminOnlyIntegrationSection
              title="Google Analytics / İstatistik"
              description="Measurement ID, Property ID, API endpoint ve rapor adresiyle istatistik bağlantısını güvenli biçimde test edin."
              providers={[
                "Google Analytics · Measurement ID ve Property",
                "Analytics API endpoint",
              ]}
              isAdmin={isAdmin}
              settings={adminSettings}
              testProviderConnection={testProviderConnection}
              storageConfig={cloudStorageConfig}
              setStorageConfig={setCloudStorageConfig}
            />
          </div>
        </>
      )}

      {section === "ayarlar" && (
        <div className="mt-5">
          <ContactSettings
            isAdmin={isAdmin}
            settings={adminSettings.data}
            pending={saveSetting.isPending}
            save={input => saveSetting.mutate(input)}
          />
        </div>
      )}
      {section === "soru-cevap" && (
        <section className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold tracking-[.16em] text-[#668278] uppercase">
                Topluluk moderasyonu
              </p>
              <h2 className="mt-2 text-xl font-bold text-[#29465a]">
                Soru-Cevap yönetimi
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#71838b]">
                Üyelerin gönderdiği soruları ve cevapları yayınlayın, gizleyin
                veya beklemede tutun.
              </p>
            </div>
            <Badge variant="outline">
              {(qaQuestions.data?.length ?? 0) + (qaAnswers.data?.length ?? 0)}{" "}
              kayıt
            </Badge>
          </div>
          <div className="mt-6 space-y-4">
            {(qaQuestions.data ?? []).map(
              (item: {
                id: number;
                status: string;
                title: string;
                body: string;
              }) => (
                <div
                  key={`q-${item.id}`}
                  className="rounded-2xl border border-[#e7ece6] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[.12em] text-[#668278]">
                        Soru · {item.status}
                      </p>
                      <h3 className="mt-1 font-bold text-[#29465a]">
                        {item.title}
                      </h3>
                      <div
                        className="prose prose-sm mt-2 max-w-none text-[#587079]"
                        dangerouslySetInnerHTML={{ __html: item.body }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          setQaStatus.mutate({
                            entity: "question",
                            id: item.id,
                            status: "published",
                          })
                        }
                        className="rounded-lg bg-[#47736a]"
                      >
                        Yayınla
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setQaStatus.mutate({
                            entity: "question",
                            id: item.id,
                            status: "hidden",
                          })
                        }
                        className="rounded-lg"
                      >
                        Gizle
                      </Button>
                    </div>
                  </div>
                </div>
              )
            )}
            {(qaAnswers.data ?? []).map(
              (item: { id: number; status: string; body: string }) => (
                <div
                  key={`a-${item.id}`}
                  className="rounded-2xl border border-[#e7ece6] bg-[#fafbf8] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[.12em] text-[#668278]">
                        Cevap · {item.status}
                      </p>
                      <div
                        className="prose prose-sm mt-2 max-w-none text-[#587079]"
                        dangerouslySetInnerHTML={{ __html: item.body }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          setQaStatus.mutate({
                            entity: "answer",
                            id: item.id,
                            status: "published",
                          })
                        }
                        className="rounded-lg bg-[#47736a]"
                      >
                        Yayınla
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setQaStatus.mutate({
                            entity: "answer",
                            id: item.id,
                            status: "hidden",
                          })
                        }
                        className="rounded-lg"
                      >
                        Gizle
                      </Button>
                    </div>
                  </div>
                </div>
              )
            )}
            {!qaQuestions.data?.length && !qaAnswers.data?.length && (
              <div className="rounded-2xl bg-[#f7f8f4] p-5 text-sm text-[#71838b]">
                Moderasyon bekleyen veya arşivlenmiş Soru-Cevap kaydı
                bulunmuyor.
              </div>
            )}
          </div>
        </section>
      )}
      {section === "guvenlik" && (
        <section className="rounded-[24px] border border-[#e6e6de] bg-white p-6">
          <h2 className="text-xl font-bold text-[#29465a]">
            Güvenlik Olayları
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#71838b]">
            Yüksek ve kritik olaylar Admin'e otomatik bildirilir.
          </p>
          {isAdmin ? (
            <div className="mt-6 space-y-2">
              {(securityEvents.data ?? []).length ? (
                securityEvents.data?.map(event => (
                  <div
                    key={event.id}
                    className="flex items-start justify-between gap-4 rounded-xl border border-[#edf0eb] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#365368]">
                        {event.eventType}
                      </p>
                      <p className="mt-1 text-xs text-[#7b8b90]">
                        {event.description}
                      </p>
                    </div>
                    <Badge variant="outline">{event.severity}</Badge>
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-[#f7f8f4] p-5 text-sm text-[#728087]">
                  Henüz kayıtlı güvenlik olayı yok.
                </div>
              )}
            </div>
          ) : (
            <RestrictedNotice />
          )}
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
  tone: string;
}) {
  return (
    <div className="rounded-[21px] border border-[#e6e6de] bg-white p-5">
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}>
        <Icon size={19} />
      </div>
      <p className="mt-5 text-3xl font-semibold tracking-[-.05em] text-[#204058]">
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold text-[#778891]">{label}</p>
    </div>
  );
}

function AdConfigurationPanel({
  isAdmin,
  saveSetting,
  assets,
}: {
  isAdmin: boolean;
  saveSetting: {
    isPending: boolean;
    mutate: (input: { settingKey: string; settingValue: string }) => void;
  };
  assets: {
    data?: Array<{
      id: number;
      fileName: string;
      mimeType?: string | null;
      publicUrl?: string | null;
    }>;
    isLoading: boolean;
    isError: boolean;
  };
}) {
  const [publisherId, setPublisherId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [adCode, setAdCode] = useState("");
  const [format, setFormat] = useState("responsive");
  const [placement, setPlacement] = useState("home");
  const [active, setActive] = useState(true);
  const [mobileVisible, setMobileVisible] = useState(true);
  const [desktopVisible, setDesktopVisible] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");
  const [advertiser, setAdvertiser] = useState("");
  const [campaignUrl, setCampaignUrl] = useState("");
  const [campaignDates, setCampaignDates] = useState("");
  const [privatePlacement, setPrivatePlacement] = useState("content");
  const [privateActive, setPrivateActive] = useState(true);
  const [mediaAssetId, setMediaAssetId] = useState("");
  const save = (settingKey: string, settingValue: string) =>
    saveSetting.mutate({ settingKey, settingValue });
  const mediaAssets = (assets.data ?? []).filter(
    asset =>
      asset.mimeType?.startsWith("image/") ||
      asset.mimeType?.startsWith("video/")
  );
  const selectedMedia = mediaAssets.find(
    asset => String(asset.id) === mediaAssetId
  );
  if (!isAdmin) return null;
  return (
    <div data-testid="ad-config-grid" className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-[24px] border border-[#e6e5dc] bg-white p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-[.16em] text-[#668278] uppercase">
              AdSense Türkiye
            </p>
            <h2 className="mt-2 text-xl font-bold text-[#29465a]">
              Yayıncı ve reklam slotu
            </h2>
          </div>
          <a
            href="https://adsense.google.com/intl/tr_tr/start/"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-[#3b7568] underline"
          >
            AdSense yönetimine git
          </a>
        </div>
        <div className="mt-5 space-y-3">
          <Input
            aria-label="AdSense yayıncı kimliği"
            value={publisherId}
            onChange={event => setPublisherId(event.target.value)}
            placeholder="ca-pub-..."
            className="rounded-xl"
          />
          <Input
            aria-label="AdSense reklam slotu"
            value={slotId}
            onChange={event => setSlotId(event.target.value)}
            placeholder="Reklam birimi / slot kimliği"
            className="rounded-xl"
          />
          <Textarea
            aria-label="AdSense reklam kodu"
            value={adCode}
            onChange={event => setAdCode(event.target.value)}
            placeholder="Reklam kodu veya güvenli script referansı"
            className="min-h-20 rounded-xl"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              aria-label="AdSense formatı"
              value={format}
              onChange={event => setFormat(event.target.value)}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="responsive">Responsive</option>
              <option value="display">Display</option>
              <option value="in-feed">In-feed</option>
            </select>
            <select
              aria-label="AdSense konumu"
              value={placement}
              onChange={event => setPlacement(event.target.value)}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="home">Ana sayfa</option>
              <option value="content">İçerik</option>
              <option value="test-results">Test sonuçları</option>
            </select>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-xl bg-[#f7f8f4] px-4 py-3 text-sm font-semibold text-[#496374]">
              Aktif <Switch checked={active} onCheckedChange={setActive} />
            </label>
            <label className="flex items-center justify-between rounded-xl bg-[#f7f8f4] px-4 py-3 text-sm font-semibold text-[#496374]">
              Mobil{" "}
              <Switch
                checked={mobileVisible}
                onCheckedChange={setMobileVisible}
              />
            </label>
            <label className="flex items-center justify-between rounded-xl bg-[#f7f8f4] px-4 py-3 text-sm font-semibold text-[#496374]">
              Masaüstü{" "}
              <Switch
                checked={desktopVisible}
                onCheckedChange={setDesktopVisible}
              />
            </label>
            <Input
              aria-label="Reklam sırası"
              type="number"
              min="0"
              value={sortOrder}
              onChange={event => setSortOrder(event.target.value)}
              placeholder="Sıra"
              className="rounded-xl"
            />
          </div>
          <Button
            disabled={
              publisherId.trim().length < 6 ||
              slotId.trim().length < 2 ||
              adCode.trim().length < 6 ||
              saveSetting.isPending
            }
            onClick={() =>
              save(
                "adsense_config",
                JSON.stringify({
                  publisherId,
                  slotId,
                  adCode,
                  format,
                  placement,
                  active,
                  mobileVisible,
                  desktopVisible,
                  sortOrder: Number(sortOrder) || 0,
                })
              )
            }
            className="w-full rounded-xl bg-[#18344f]"
          >
            AdSense ayarlarını kaydet
          </Button>
        </div>
      </div>
      <div className="rounded-[24px] border border-[#e6e5dc] bg-white p-6">
        <div>
          <p className="text-[11px] font-bold tracking-[.16em] text-[#668278] uppercase">
            Özel firma kampanyası
          </p>
          <h2 className="mt-2 text-xl font-bold text-[#29465a]">
            Kampanya, medya ve yerleşim
          </h2>
        </div>
        <div className="mt-5 space-y-3">
          <Input
            aria-label="Reklamveren"
            value={advertiser}
            onChange={event => setAdvertiser(event.target.value)}
            placeholder="Reklamveren adı"
            className="rounded-xl"
          />
          <Input
            aria-label="Hedef URL"
            value={campaignUrl}
            onChange={event => setCampaignUrl(event.target.value)}
            placeholder="https://firma.example"
            className="rounded-xl"
          />
          <Input
            aria-label="Kampanya tarih aralığı"
            value={campaignDates}
            onChange={event => setCampaignDates(event.target.value)}
            placeholder="2026-09-01 — 2026-09-30"
            className="rounded-xl"
          />
          {assets.isLoading ? (
            <div className="rounded-xl bg-[#f7f8f4] p-3 text-xs text-[#71838b]">
              Reklam medya varlıkları yükleniyor…
            </div>
          ) : assets.isError ? (
            <div className="rounded-xl bg-[#fff5f1] p-3 text-xs text-[#8b5a4e]">
              Reklam medya varlıkları yüklenemedi.
            </div>
          ) : (
            <>
              <select
                aria-label="Reklam medya varlığı"
                value={mediaAssetId}
                onChange={event => setMediaAssetId(event.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">Medya varlığı seçin</option>
                {mediaAssets.map(asset => (
                  <option key={asset.id} value={asset.id}>
                    {asset.fileName}
                  </option>
                ))}
              </select>
              {mediaAssets.length === 0 && (
                <p className="text-xs text-[#7b8b90]">
                  Görsel/video medya varlığı bulunamadı; önce Medya Merkezi’nden
                  yükleyin.
                </p>
              )}
            </>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              aria-label="Özel reklam konumu"
              value={privatePlacement}
              onChange={event => setPrivatePlacement(event.target.value)}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="home">Ana sayfa</option>
              <option value="content">İçerik</option>
              <option value="test-results">Test sonuçları</option>
            </select>
            <Input
              aria-label="Özel reklam sırası"
              type="number"
              min="0"
              value={sortOrder}
              onChange={event => setSortOrder(event.target.value)}
              placeholder="Sıra"
              className="rounded-xl"
            />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-[#f7f8f4] px-4 py-3 text-sm font-semibold text-[#496374]">
            Özel reklam aktif{" "}
            <Switch
              checked={privateActive}
              onCheckedChange={setPrivateActive}
            />
          </div>
          {selectedMedia && (
            <div className="overflow-hidden rounded-2xl border border-[#e9ede8] bg-[#f7f8f4] p-3">
              <p className="text-xs font-semibold text-[#6f8188]">
                Önizleme · {selectedMedia.fileName}
              </p>
              {selectedMedia.mimeType?.startsWith("image/") &&
              selectedMedia.publicUrl ? (
                <img
                  src={selectedMedia.publicUrl}
                  alt="Reklam medya önizlemesi"
                  className="mt-2 h-28 w-full rounded-xl object-cover"
                />
              ) : (
                <div className="mt-2 rounded-xl bg-[#e9eee9] p-5 text-center text-xs text-[#668278]">
                  Video medya seçildi; oynatma hosting sonrası etkinleşir.
                </div>
              )}
            </div>
          )}
          <Button
            variant="outline"
            disabled={
              advertiser.trim().length < 2 ||
              campaignUrl.trim().length < 8 ||
              !mediaAssetId ||
              saveSetting.isPending
            }
            onClick={() =>
              save(
                "private_ad_campaign",
                JSON.stringify({
                  advertiser,
                  campaignUrl,
                  campaignDates,
                  mediaAssetId: Number(mediaAssetId),
                  placement: privatePlacement,
                  active: privateActive,
                  sortOrder: Number(sortOrder) || 0,
                })
              )
            }
            className="w-full rounded-xl"
          >
            Özel kampanyayı kaydet
          </Button>
        </div>
      </div>
    </div>
  );
}

function SearchConsoleStatusPanel({
  status,
}: {
  status: {
    data?: {
      configured: boolean;
      propertyUrl: string | null;
      verificationStatus: string;
      sitemapStatus: string;
      lastError: string | null;
    };
    isLoading: boolean;
    isError: boolean;
  };
}) {
  if (status.isLoading)
    return (
      <div className="rounded-[24px] border border-[#e6e5dc] bg-white p-6">
        <div className="h-5 w-48 animate-pulse rounded bg-[#eef2ee]" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="h-16 animate-pulse rounded-2xl bg-[#f4f6f2]" />
          <div className="h-16 animate-pulse rounded-2xl bg-[#f4f6f2]" />
        </div>
      </div>
    );
  if (status.isError)
    return (
      <div className="rounded-[24px] border border-[#f0d7d0] bg-[#fff8f5] p-6 text-sm text-[#7d4f45]">
        Search Console durum bilgisi yüklenemedi.
      </div>
    );
  const value = status.data;
  return (
    <div className="rounded-[24px] border border-[#e6e5dc] bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[.16em] text-[#668278] uppercase">
            Search Console durumu
          </p>
          <h2 className="mt-2 text-xl font-bold text-[#29465a]">
            Mülk ve indeksleme hazırlığı
          </h2>
        </div>
        <Badge
          className={`border-0 ${value?.configured ? "bg-[#e3f2e9] text-[#4f806d]" : "bg-[#fff3d8] text-[#9a742d]"}`}
        >
          {value?.configured ? "Mülk bağlı" : "Bağlantı bekliyor"}
        </Badge>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-[#f7f8f4] p-4">
          <p className="text-xs font-semibold text-[#708188]">Mülk</p>
          <p className="mt-2 break-all text-sm font-semibold text-[#365368]">
            {value?.propertyUrl ?? "Henüz eklenmedi"}
          </p>
        </div>
        <div className="rounded-2xl bg-[#f7f8f4] p-4">
          <p className="text-xs font-semibold text-[#708188]">Doğrulama</p>
          <p className="mt-2 text-sm font-semibold text-[#365368]">
            {value?.verificationStatus ?? "not_configured"}
          </p>
        </div>
        <div className="rounded-2xl bg-[#f7f8f4] p-4">
          <p className="text-xs font-semibold text-[#708188]">Sitemap</p>
          <p className="mt-2 text-sm font-semibold text-[#365368]">
            {value?.sitemapStatus ?? "not_configured"}
          </p>
        </div>
        <div className="rounded-2xl bg-[#f7f8f4] p-4">
          <p className="text-xs font-semibold text-[#708188]">Son hata</p>
          <p className="mt-2 text-sm font-semibold text-[#365368]">
            {value?.lastError ?? "Hata kaydı yok"}
          </p>
        </div>
      </div>
    </div>
  );
}

function RestrictedNotice() {
  return (
    <div className="mt-6 rounded-xl bg-[#f8f7f2] p-4 text-sm leading-6 text-[#6f8085]">
      Bu modül size açık değil. Admin, panel izinleri bölümünden erişimi
      açabilir.
    </div>
  );
}

function MediaManagementPanel({
  isAdmin,
  assets,
  mediaFileName,
  setMediaFileName,
  mediaProvider,
  setMediaProvider,
  mediaPublicUrl,
  setMediaPublicUrl,
  mediaFolderPath,
  setMediaFolderPath,
  uploadMediaAsset,
  mediaMimeType,
  setMediaMimeType,
  mediaContentType,
  setMediaContentType,
  mediaSearch,
  setMediaSearch,
  mediaProviderFilter,
  setMediaProviderFilter,
  mediaContentFilter,
  setMediaContentFilter,
  mediaFolderFilter,
  setMediaFolderFilter,
  createMediaAsset,
  transferJobs,
  transferAssetId,
  setTransferAssetId,
  transferTarget,
  setTransferTarget,
  transferOperation,
  setTransferOperation,
  createTransferJob,
  retryTransferJob,
  cancelTransferJob,
  archiveMedia,
  contentTargets,
  linkMediaAsset,
}: {
  isAdmin: boolean;
  assets: {
    data?: Array<{
      id: number;
      fileName: string;
      provider: string;
      contentType: string;
      status: string;
      publicUrl?: string | null;
      sizeBytes?: number | null;
      folderPath?: string | null;
    }>;
    isLoading: boolean;
    isError: boolean;
  };
  mediaFileName: string;
  setMediaFileName: (value: string) => void;
  mediaProvider:
    | "s3"
    | "google-drive-personal"
    | "google-drive-workspace"
    | "bunny-storage"
    | "bunny-stream";
  setMediaProvider: (
    value:
      | "s3"
      | "google-drive-personal"
      | "google-drive-workspace"
      | "bunny-storage"
      | "bunny-stream"
  ) => void;
  mediaPublicUrl: string;
  setMediaPublicUrl: (value: string) => void;
  mediaFolderPath: string;
  setMediaFolderPath: (value: string) => void;
  uploadMediaAsset: {
    isPending: boolean;
    mutate: (input: {
      fileName: string;
      mimeType: string;
      dataBase64: string;
      contentType:
        | "test"
        | "document"
        | "video"
        | "simulation"
        | "game"
        | "news"
        | "general";
    }) => void;
  };
  mediaMimeType: string;
  setMediaMimeType: (value: string) => void;
  mediaContentType:
    | "test"
    | "document"
    | "video"
    | "simulation"
    | "game"
    | "news"
    | "general";
  setMediaContentType: (
    value:
      | "test"
      | "document"
      | "video"
      | "simulation"
      | "game"
      | "news"
      | "general"
  ) => void;
  mediaSearch: string;
  setMediaSearch: (value: string) => void;
  mediaProviderFilter: string;
  setMediaProviderFilter: (value: string) => void;
  mediaContentFilter: string;
  setMediaContentFilter: (value: string) => void;
  mediaFolderFilter: string;
  setMediaFolderFilter: (value: string) => void;
  createMediaAsset: {
    isPending: boolean;
    mutate: (input: {
      provider:
        | "s3"
        | "google-drive-personal"
        | "google-drive-workspace"
        | "bunny-storage"
        | "bunny-stream";
      fileName: string;
      publicUrl?: string | null;
      folderPath?: string | null;
      mimeType: string;
      contentType:
        | "test"
        | "document"
        | "video"
        | "simulation"
        | "game"
        | "news"
        | "general";
    }) => void;
  };
  transferJobs: {
    data?: Array<{
      id: number;
      status: string;
      operation: string;
      progress?: number | null;
      mediaAssetId?: number;
    }>;
    isLoading: boolean;
    isError: boolean;
  };
  transferAssetId: string;
  setTransferAssetId: (value: string) => void;
  transferTarget:
    | "s3"
    | "google-drive-personal"
    | "google-drive-workspace"
    | "bunny-storage"
    | "bunny-stream";
  setTransferTarget: (
    value:
      | "s3"
      | "google-drive-personal"
      | "google-drive-workspace"
      | "bunny-storage"
      | "bunny-stream"
  ) => void;
  transferOperation: "copy" | "move";
  setTransferOperation: (value: "copy" | "move") => void;
  createTransferJob: {
    isPending: boolean;
    mutate: (input: {
      mediaAssetId: number;
      sourceProvider:
        | "s3"
        | "google-drive-personal"
        | "google-drive-workspace"
        | "bunny-storage"
        | "bunny-stream";
      targetProvider:
        | "s3"
        | "google-drive-personal"
        | "google-drive-workspace"
        | "bunny-storage"
        | "bunny-stream";
      operation: "copy" | "move";
    }) => void;
  };
  retryTransferJob: {
    isPending: boolean;
    mutate: (input: { id: number }) => void;
  };
  cancelTransferJob: {
    isPending: boolean;
    mutate: (input: { id: number }) => void;
  };
  archiveMedia: { isPending: boolean; mutate: (input: { id: number }) => void };
  contentTargets: Array<{ id: number; title: string; targetType: "content" | "test"; typeLabel: string }>;
  linkMediaAsset: { isPending: boolean; mutate: (input: { mediaAssetId: number; targetType: "content" | "test"; targetId: number; role: string }) => void };
}) {
  if (!isAdmin) return null;
  const providerLabel: Record<string, string> = {
    s3: "S3",
    "google-drive-personal": "Google Drive · Kişisel",
    "google-drive-workspace": "Google Drive · Workspace",
    "bunny-storage": "Bunny Storage",
    "bunny-stream": "Bunny Stream",
    "bunny-pull-zone": "Bunny CDN · Pull Zone",
  };
  const folderOptions = Array.from(
    new Set(
      (assets.data ?? []).map(asset => asset.folderPath?.trim() || "Klasörsüz")
    )
  ).sort((a, b) => a.localeCompare(b, "tr"));
  const [linkModalAssetId, setLinkModalAssetId] = useState<number | null>(null);
  const [targetSearch, setTargetSearch] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<{ id: number; title: string; targetType: "content" | "test"; typeLabel: string } | null>(null);
  const filteredTargets = contentTargets.filter(target => !targetSearch.trim() || target.title.toLocaleLowerCase("tr-TR").includes(targetSearch.trim().toLocaleLowerCase("tr-TR")) || target.typeLabel.toLocaleLowerCase("tr-TR").includes(targetSearch.trim().toLocaleLowerCase("tr-TR")));
  const filteredAssets = (assets.data ?? []).filter(asset => {
    const matchesSearch =
      !mediaSearch.trim() ||
      asset.fileName
        .toLocaleLowerCase("tr-TR")
        .includes(mediaSearch.trim().toLocaleLowerCase("tr-TR"));
    const matchesProvider =
      mediaProviderFilter === "all" || asset.provider === mediaProviderFilter;
    const matchesContent =
      mediaContentFilter === "all" || asset.contentType === mediaContentFilter;
    const folder = asset.folderPath?.trim() || "Klasörsüz";
    const matchesFolder =
      mediaFolderFilter === "all" || folder === mediaFolderFilter;
    return matchesSearch && matchesProvider && matchesContent && matchesFolder;
  });
  return (
    <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <div className="rounded-[24px] border border-[#e6e5dc] bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-[.16em] text-[#668278] uppercase">
              Medya varlıkları
            </p>
            <h2 className="mt-2 text-xl font-bold text-[#29465a]">
              Dosya kütüphanesi
            </h2>
          </div>
          <Badge className="border-0 bg-[#eef4f0] text-[#548073] hover:bg-[#eef4f0]">
            {assets.isLoading
              ? "Yükleniyor"
              : `${filteredAssets.length}/${assets.data?.length ?? 0} kayıt`}
          </Badge>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Input
            aria-label="Medya ara"
            value={mediaSearch}
            onChange={event => setMediaSearch(event.target.value)}
            placeholder="Dosya adı ara..."
            className="rounded-xl sm:col-span-1"
          />
          <select
            aria-label="Sağlayıcı filtresi"
            value={mediaProviderFilter}
            onChange={event => setMediaProviderFilter(event.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
          >
            <option value="all">Tüm sağlayıcılar</option>
            {Object.entries(providerLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="İçerik filtresi"
            value={mediaContentFilter}
            onChange={event => setMediaContentFilter(event.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
          >
            <option value="all">Tüm modüller</option>
            <option value="test">Test</option>
            <option value="document">Doküman</option>
            <option value="video">Video</option>
            <option value="simulation">Simülasyon</option>
            <option value="game">Oyun</option>
            <option value="news">Haber</option>
            <option value="general">Genel</option>
          </select>
          <select
            aria-label="Klasör filtresi"
            value={mediaFolderFilter}
            onChange={event => setMediaFolderFilter(event.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
          >
            <option value="all">Tüm klasörler</option>
            {folderOptions.map(folder => (
              <option key={folder} value={folder}>
                {folder}
              </option>
            ))}
          </select>
        </div>
        {assets.isError ? (
          <p className="mt-5 rounded-xl bg-[#fff8f5] p-4 text-sm text-[#7d4f45]">
            Medya listesi yüklenemedi.
          </p>
        ) : assets.isLoading ? (
          <div className="mt-5 space-y-3">
            <div className="h-14 animate-pulse rounded-xl bg-[#f1f4ef]" />
            <div className="h-14 animate-pulse rounded-xl bg-[#f1f4ef]" />
          </div>
        ) : (assets.data ?? []).length ? (
          <div className="mt-5 space-y-3">
            {filteredAssets.map(asset => (
              <div
                key={asset.id}
                className="flex flex-col gap-3 rounded-2xl border border-[#edf0eb] bg-[#fbfcf8] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#365368]">
                    {asset.fileName}
                  </p>
                  <p className="mt-1 text-xs text-[#829096]">
                    {providerLabel[asset.provider] ?? asset.provider} ·{" "}
                    {asset.contentType} · {asset.status}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-[#8a9b8f]">
                    Klasör: {asset.folderPath?.trim() || "Klasörsüz"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={archiveMedia.isPending}
                    onClick={() => archiveMedia.mutate({ id: asset.id })}
                    className="rounded-xl"
                  >
                    Arşivle
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => { setLinkModalAssetId(asset.id); setSelectedTarget(null); setTargetSearch(""); }}>
                    İçeriğe bağla
                  </Button>
                  {asset.publicUrl && (
                    <a
                      href={asset.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-[#dfe8e1] px-3 py-1.5 text-xs font-semibold text-[#477263]"
                    >
                      Önizle
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-[#f7f8f4] p-4 text-sm leading-6 text-[#728087]">
            Henüz medya varlığı yok. Sağlayıcı bağlantıları hosting sonrası
            etkinleştirildiğinde dosyalar burada görünecek.
          </p>
        )}
      </div>
      <div className="space-y-5">
        <div className="rounded-[24px] border border-[#e6e5dc] bg-white p-6">
          <p className="text-[11px] font-bold tracking-[.16em] text-[#668278] uppercase">
            Yeni medya kaydı
          </p>
          <h2 className="mt-2 text-xl font-bold text-[#29465a]">
            Dosya metadata’sı ekle
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#71838b]">
            Gerçek dosya bağlantıları hosting sonrası etkinleşir; şimdiden
            sağlayıcı, URL ve içerik ilişkisini kaydedebilirsiniz.
          </p>
          <div className="mt-5 space-y-3">
            <Label>Dosya seç</Label>
            <Input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,video/mp4,video/webm,.docx"
              aria-label="S3 dosyası seç"
              className="rounded-xl file:mr-3 file:rounded-lg file:border-0 file:bg-[#edf4ef] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#477263]"
              onChange={async event => {
                const file = event.target.files?.[0];
                if (!file) return;
                const dataBase64 = await new Promise<string>(
                  (resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () =>
                      resolve(String(reader.result).split(",")[1] ?? "");
                    reader.onerror = () => reject(reader.error);
                    reader.readAsDataURL(file);
                  }
                );
                uploadMediaAsset.mutate({
                  fileName: file.name,
                  mimeType: file.type || "application/octet-stream",
                  dataBase64,
                  contentType: mediaContentType,
                });
                event.currentTarget.value = "";
              }}
            />
            <p className="text-xs leading-5 text-[#7c8d91]">
              S3 dahili depolama için en fazla 20 MB; PDF, görsel, video ve DOCX
              desteklenir.
            </p>
            <Label>Dosya adı</Label>
            <Input
              value={mediaFileName}
              onChange={event => setMediaFileName(event.target.value)}
              placeholder="örnek-dokuman.pdf"
              className="rounded-xl"
            />
            <Label>Sağlayıcı</Label>
            <select
              value={mediaProvider}
              onChange={event =>
                setMediaProvider(event.target.value as typeof mediaProvider)
              }
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="s3">S3</option>
              <option value="google-drive-personal">
                Google Drive · Kişisel
              </option>
              <option value="google-drive-workspace">
                Google Drive · Workspace
              </option>
              <option value="bunny-storage">Bunny Storage</option>
              <option value="bunny-stream">Bunny Stream</option>
            </select>
            <Label>Dosya URL’si</Label>
            <Input
              value={mediaPublicUrl}
              onChange={event => setMediaPublicUrl(event.target.value)}
              placeholder="https://..."
              className="rounded-xl"
            />
            <Label>Klasör yolu</Label>
            <Input
              aria-label="Klasör yolu"
              value={mediaFolderPath}
              onChange={event => setMediaFolderPath(event.target.value)}
              placeholder="Dersler/Türkçe"
              className="rounded-xl"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>MIME türü</Label>
                <Input
                  value={mediaMimeType}
                  onChange={event => setMediaMimeType(event.target.value)}
                  className="mt-2 rounded-xl"
                />
              </div>
              <div>
                <Label>İçerik modülü</Label>
                <select
                  value={mediaContentType}
                  onChange={event =>
                    setMediaContentType(
                      event.target.value as typeof mediaContentType
                    )
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="general">Genel</option>
                  <option value="test">Test</option>
                  <option value="document">Doküman</option>
                  <option value="video">Video</option>
                  <option value="simulation">Simülasyon</option>
                  <option value="game">Oyun</option>
                  <option value="news">Haber</option>
                </select>
              </div>
            </div>
            <Button
              type="button"
              disabled={
                !mediaFileName.trim() ||
                createMediaAsset.isPending ||
                uploadMediaAsset.isPending
              }
              onClick={() =>
                createMediaAsset.mutate({
                  provider: mediaProvider,
                  fileName: mediaFileName.trim(),
                  publicUrl: mediaPublicUrl.trim() || null,
                  folderPath: mediaFolderPath.trim() || null,
                  mimeType: mediaMimeType.trim() || "application/octet-stream",
                  contentType: mediaContentType,
                })
              }
              className="w-full rounded-xl bg-[#18344f]"
            >
              {createMediaAsset.isPending
                ? "Kaydediliyor..."
                : "Medya kaydını oluştur"}
            </Button>
          </div>
        </div>
        <div className="rounded-[24px] border border-[#e6e5dc] bg-white p-6">
          <p className="text-[11px] font-bold tracking-[.16em] text-[#668278] uppercase">
            Sağlayıcılar arası aktarım
          </p>
          <h2 className="mt-2 text-xl font-bold text-[#29465a]">
            Kopyala veya taşı
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#71838b]">
            Mevcut bir medya varlığını başka bir sağlayıcıya Admin olarak
            kuyruğa alabilirsiniz.
          </p>
          <div className="mt-5 space-y-3">
            <Label>Medya varlığı</Label>
            <select
              value={transferAssetId}
              onChange={event => setTransferAssetId(event.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="">Varlık seçin</option>
              {(assets.data ?? [])
                .filter(asset => asset.status !== "archived")
                .map(asset => (
                  <option key={asset.id} value={asset.id}>
                    {asset.fileName} ·{" "}
                    {providerLabel[asset.provider] ?? asset.provider}
                  </option>
                ))}
            </select>
            <Label>Hedef sağlayıcı</Label>
            <select
              value={transferTarget}
              onChange={event =>
                setTransferTarget(event.target.value as typeof transferTarget)
              }
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="s3">S3</option>
              <option value="google-drive-personal">
                Google Drive · Kişisel
              </option>
              <option value="google-drive-workspace">
                Google Drive · Workspace
              </option>
              <option value="bunny-storage">Bunny Storage</option>
              <option value="bunny-stream">Bunny Stream</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={transferOperation === "copy" ? "default" : "outline"}
                onClick={() => setTransferOperation("copy")}
                className="rounded-xl"
              >
                Kopyala
              </Button>
              <Button
                type="button"
                variant={transferOperation === "move" ? "default" : "outline"}
                onClick={() => setTransferOperation("move")}
                className="rounded-xl"
              >
                Taşı
              </Button>
            </div>
            <Button
              disabled={!transferAssetId || createTransferJob.isPending}
              onClick={() => {
                const asset = assets.data?.find(
                  item => item.id === Number(transferAssetId)
                );
                if (!asset) return;
                createTransferJob.mutate({
                  mediaAssetId: asset.id,
                  sourceProvider: asset.provider as typeof transferTarget,
                  targetProvider: transferTarget,
                  operation: transferOperation,
                });
              }}
              className="w-full rounded-xl bg-[#18344f]"
            >
              {createTransferJob.isPending
                ? "Kuyruğa alınıyor..."
                : "Aktarımı başlat"}
            </Button>
          </div>
        </div>
        <div className="rounded-[24px] border border-[#e6e5dc] bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#29465a]">Aktarım işleri</h2>
            <Badge className="border-0 bg-[#f8edcf] text-[#9c7427] hover:bg-[#f8edcf]">
              {transferJobs.data?.length ?? 0}
            </Badge>
          </div>
          {transferJobs.isLoading ? (
            <p className="mt-4 text-sm text-[#7d8c91]">
              Aktarım işleri yükleniyor...
            </p>
          ) : transferJobs.isError ? (
            <p className="mt-4 text-sm text-[#7d4f45]">
              Aktarım işleri yüklenemedi.
            </p>
          ) : (transferJobs.data ?? []).length ? (
            <div className="mt-4 space-y-2">
              {transferJobs.data?.map(job => (
                <div
                  key={job.id}
                  className="flex flex-col gap-3 rounded-xl bg-[#f7f8f4] px-3 py-3 text-xs text-[#607781] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-[#365368]">
                      #{job.id} · {job.operation}
                    </p>
                    <p className="mt-1">
                      Durum: {job.status}
                      {job.progress !== null && job.progress !== undefined
                        ? ` · %${job.progress}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {(job.status === "failed" ||
                      job.status === "cancelled") && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={retryTransferJob.isPending}
                        onClick={() => retryTransferJob.mutate({ id: job.id })}
                        className="rounded-lg"
                      >
                        Yeniden dene
                      </Button>
                    )}
                    {(job.status === "queued" || job.status === "running") && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={cancelTransferJob.isPending}
                        onClick={() => cancelTransferJob.mutate({ id: job.id })}
                        className="rounded-lg text-[#8d5e55]"
                      >
                        İptal et
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[#7d8c91]">
              Henüz aktarım işi yok.
            </p>
          )}
        </div>
      </div>
      {linkModalAssetId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#173247]/35 p-4" role="dialog" aria-modal="true" aria-label="İçeriğe bağla">
          <div className="max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-[#e1e8df] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold tracking-[.16em] text-[#668278] uppercase">Medya Merkezi</p>
                <h2 className="mt-2 text-xl font-bold text-[#29465a]">İçeriğe bağla</h2>
                <p className="mt-2 text-sm leading-6 text-[#71838b]">Dosyayı bağlamak istediğiniz test veya içeriği arayın ve seçin.</p>
              </div>
              <Button type="button" variant="ghost" onClick={() => setLinkModalAssetId(null)} aria-label="Bağlama penceresini kapat">Kapat</Button>
            </div>
            <Input value={targetSearch} onChange={event => setTargetSearch(event.target.value)} placeholder="Başlık veya içerik türü ara..." className="mt-5 rounded-xl" />
            <div className="mt-4 space-y-2">
              {filteredTargets.length ? filteredTargets.map(target => (
                <button type="button" key={`${target.targetType}-${target.id}`} onClick={() => setSelectedTarget(target)} className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${selectedTarget?.id === target.id && selectedTarget.targetType === target.targetType ? "border-[#3aa894] bg-[#edf8f2]" : "border-[#e7ece7] bg-[#fbfcf8] hover:border-[#9fc7b6]"}`}>
                  <span><span className="block font-semibold text-[#365368]">{target.title}</span><span className="mt-1 block text-xs text-[#7c8d91]">{target.typeLabel} · {target.targetType === "test" ? "Test" : "İçerik"} #{target.id}</span></span>
                  <span className="text-xs font-semibold text-[#477263]">{selectedTarget?.id === target.id && selectedTarget.targetType === target.targetType ? "Seçildi" : "Seç"}</span>
                </button>
              )) : <p className="rounded-2xl bg-[#f7f8f4] p-4 text-sm text-[#728087]">Aramanızla eşleşen kayıt bulunamadı.</p>}
            </div>
            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-[#f7f8f4] p-4">
              <p className="text-sm text-[#607781]">{selectedTarget ? `Seçilen: ${selectedTarget.title}` : "Henüz hedef seçilmedi."}</p>
              <Button type="button" disabled={!selectedTarget || linkMediaAsset.isPending} onClick={() => { if (!selectedTarget || linkModalAssetId === null) return; linkMediaAsset.mutate({ mediaAssetId: linkModalAssetId, targetType: selectedTarget.targetType, targetId: selectedTarget.id, role: "attachment" }); setLinkModalAssetId(null); }} className="rounded-xl bg-[#18344f]">{linkMediaAsset.isPending ? "Bağlanıyor..." : "Seçili içeriğe bağla"}</Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

type CloudStorageConfig = {
  apiKey: string;
  apiSecret: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  storageZone: string;
  streamLibraryId: string;
  dnsZoneId: string;
  pullZoneId: string;
  cdnHostname: string;
  originUrl: string;
  zoneSecurityKey: string;
  customDomain: string;
  region: string;
  endpoint: string;
  clientId: string;
  clientSecret: string;
  sharedDriveId: string;
  propertyId: string;
  measurementId: string;
  redirectUri?: string;
  siteUrl?: string;
  channelId: string;
  channelUrl: string;
  videoUrl: string;
  embedUrl: string;
};

type ProviderKey =
  | "s3"
  | "google-drive-personal"
  | "google-drive-workspace"
  | "bunny-storage"
  | "bunny-stream"
  | "bunny-dns"
  | "bunny-pull-zone"
  | "adsense"
  | "search-console"
  | "google-analytics"
  | "youtube"
  | "video-source";

function AdminOnlyIntegrationSection({
  title,
  description,
  providers,
  isAdmin,
  settings,
  testProviderConnection,
  storageConfig,
  setStorageConfig,
  initialProvider,
}: {
  title: string;
  description: string;
  providers: string[];
  isAdmin: boolean;
  settings: {
    data?: Array<{ settingKey: string; settingValue: string | null }>;
    isLoading: boolean;
    isError: boolean;
  };
  testProviderConnection: {
    isPending: boolean;
    mutate: (input: {
      provider: ProviderKey;
      config?: CloudStorageConfig;
    }) => void;
  };
  storageConfig?: CloudStorageConfig;
  setStorageConfig?: (value: CloudStorageConfig) => void;
  initialProvider?: ProviderKey;
}) {
  const [selectedProvider, setSelectedProvider] = useState<ProviderKey>(initialProvider ?? "s3");
  if (!isAdmin) return <RestrictedNotice />;
  if (settings.isLoading)
    return (
      <section className="rounded-[24px] border border-[#e6e5dc] bg-white p-6">
        <div className="h-5 w-40 animate-pulse rounded bg-[#e8eee9]" />
        <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-[#eef2ed]" />
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {providers.slice(0, 4).map(provider => (
            <div
              key={provider}
              className="h-20 animate-pulse rounded-2xl bg-[#f1f4ef]"
            />
          ))}
        </div>
      </section>
    );
  if (settings.isError)
    return (
      <section className="rounded-[24px] border border-[#ecd7d0] bg-[#fff8f5] p-6">
        <h2 className="text-lg font-bold text-[#7d4f45]">
          Bağlantı ayarları yüklenemedi.
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#8d6a63]">
          Admin ayarları okunamadı. Ayarları ve provider erişimini kontrol edin.
        </p>
      </section>
    );
  const configuredKeys = new Set(
    (settings.data ?? [])
      .filter(item => item.settingValue?.trim())
      .map(item => item.settingKey)
  );
  const providerIsConfigured = (provider: string) =>
    provider.includes("Google AdSense")
      ? configuredKeys.has("adsense_publisher_id")
      : provider.includes("Search") ||
          provider.includes("Sitemap") ||
          provider.includes("URL") ||
          provider.includes("Analytics")
        ? configuredKeys.has("google_search_console_site")
        : provider.includes("S3")
          ? true
          : false;
  const configuredCount = providers.filter(providerIsConfigured).length;
  const providerKeyForLabel = (provider: string): ProviderKey =>
    provider.includes("S3")
      ? "s3"
      : provider.includes("Kişisel")
        ? "google-drive-personal"
        : provider.includes("Workspace")
          ? "google-drive-workspace"
          : provider.includes("Storage")
            ? "bunny-storage"
            : provider.includes("Stream")
              ? "bunny-stream"
              : provider.includes("DNS")
                ? "bunny-dns"
                : provider.includes("CDN") || provider.includes("Pull")
                  ? "bunny-pull-zone"
                  : provider.includes("AdSense")
                    ? "adsense"
                    : "search-console";
  const updateField = (field: keyof CloudStorageConfig, value: string) =>
    setStorageConfig?.({
      ...(storageConfig as CloudStorageConfig),
      [field]: value,
    });
  const fields: Record<
    ProviderKey,
    Array<{
      key: keyof CloudStorageConfig;
      label: string;
      secret?: boolean;
      placeholder: string;
    }>
  > = {
    s3: [
      { key: "accessKeyId", label: "Access Key ID", placeholder: "AKIA…" },
      {
        key: "secretAccessKey",
        label: "Secret Access Key",
        secret: true,
        placeholder: "Sunucuda saklanacak secret",
      },
      { key: "bucketName", label: "Bucket adı", placeholder: "okulblog-media" },
      { key: "region", label: "Region", placeholder: "eu-central-1" },
      {
        key: "endpoint",
        label: "Endpoint (isteğe bağlı)",
        placeholder: "https://…",
      },
    ],
    "google-drive-personal": [
      {
        key: "clientId",
        label: "Google Client ID",
        placeholder: "…apps.googleusercontent.com",
      },
      {
        key: "clientSecret",
        label: "Google Client Secret",
        secret: true,
        placeholder: "OAuth secret",
      },
    ],
    "google-drive-workspace": [
      {
        key: "clientId",
        label: "Google Client ID",
        placeholder: "…apps.googleusercontent.com",
      },
      {
        key: "clientSecret",
        label: "Google Client Secret",
        secret: true,
        placeholder: "OAuth secret",
      },
      { key: "sharedDriveId", label: "Shared Drive ID", placeholder: "0A…" },
    ],
    "bunny-storage": [
      {
        key: "apiKey",
        label: "Bunny API Key",
        secret: true,
        placeholder: "Bunny API key",
      },
      {
        key: "storageZone",
        label: "Storage Zone adı",
        placeholder: "okulblog-media",
      },
    ],
    "bunny-stream": [
      {
        key: "apiKey",
        label: "Bunny API Key",
        secret: true,
        placeholder: "Bunny API key",
      },
      {
        key: "streamLibraryId",
        label: "Stream Library ID",
        placeholder: "123456",
      },
    ],
    "bunny-dns": [
      {
        key: "apiKey",
        label: "Bunny API Key",
        secret: true,
        placeholder: "Bunny API key",
      },
      { key: "dnsZoneId", label: "DNS Zone ID", placeholder: "123456" },
    ],
    "bunny-pull-zone": [
      {
        key: "apiKey",
        label: "Bunny API Key",
        secret: true,
        placeholder: "Bunny API key",
      },
      { key: "pullZoneId", label: "Pull Zone ID", placeholder: "123456" },
      {
        key: "cdnHostname",
        label: "CDN hostname",
        placeholder: "cdn.example.b-cdn.net",
      },
      {
        key: "originUrl",
        label: "Origin URL",
        placeholder: "https://origin.example.com",
      },
      {
        key: "zoneSecurityKey",
        label: "Zone Security Key",
        secret: true,
        placeholder: "Bunny zone security key",
      },
      {
        key: "customDomain",
        label: "Özel domain (isteğe bağlı)",
        placeholder: "cdn.okulblog.com",
      },
    ],
    adsense: [],
    "search-console": [
      {
        key: "clientId",
        label: "Google OAuth Client ID",
        placeholder: "…apps.googleusercontent.com",
      },
      {
        key: "clientSecret",
        label: "Google OAuth Client Secret",
        secret: true,
        placeholder: "Hosting secret olarak girilecek",
      },
      {
        key: "redirectUri",
        label: "OAuth Redirect URL",
        placeholder: "https://okulblog.com/api/search-console/callback",
      },
      {
        key: "siteUrl",
        label: "Search Console mülk URL’si",
        placeholder: "https://okulblog.com/ veya sc-domain:okulblog.com",
      },
    ],
    "google-analytics": [
      {
        key: "measurementId",
        label: "Google Analytics Measurement ID",
        placeholder: "G-XXXXXXXXXX",
      },
      {
        key: "propertyId",
        label: "Analytics Property ID",
        placeholder: "123456789",
      },
      {
        key: "endpoint",
        label: "Analytics API endpoint",
        placeholder: "https://analyticsdata.googleapis.com",
      },
    ],
    youtube: [
      {
        key: "apiKey",
        label: "YouTube Data API key",
        secret: true,
        placeholder: "AIza…",
      },
      { key: "channelId", label: "Kanal ID", placeholder: "UC…" },
      {
        key: "channelUrl",
        label: "Kanal adresi",
        placeholder: "https://youtube.com/@okulblog",
      },
      {
        key: "endpoint",
        label: "YouTube API endpoint",
        placeholder: "https://www.googleapis.com/youtube/v3",
      },
    ],
    "video-source": [
      {
        key: "videoUrl",
        label: "Video adresi",
        placeholder: "https://…/video.mp4 veya YouTube URL",
      },
      {
        key: "embedUrl",
        label: "Embed adresi",
        placeholder: "https://www.youtube.com/embed/…",
      },
      {
        key: "endpoint",
        label: "Video sağlayıcı endpoint’i",
        placeholder: "https://…",
      },
    ],
  };
  const selectedFields = fields[selectedProvider];
  return (
    <section className="space-y-5">
      <div className="rounded-[24px] border border-[#e6e5dc] bg-white p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-[.16em] text-[#668278] uppercase">
              Bağlantı merkezi
            </p>
            <h2 className="mt-2 text-xl font-bold text-[#29465a]">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#71838b]">
              {description}
            </p>
          </div>
          <Badge
            className={`w-fit border-0 ${configuredCount ? "bg-[#e3f2e9] text-[#4f806d] hover:bg-[#e3f2e9]" : "bg-[#fff3d8] text-[#9a742d] hover:bg-[#fff3d8]"}`}
          >
            {configuredCount
              ? `${configuredCount}/${providers.length} hazır`
              : "Yapılandırılmadı"}
          </Badge>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {providers.map(provider => {
            const configured = providerIsConfigured(provider);
            return (
              <div
                key={provider}
                className="flex items-center justify-between gap-4 rounded-2xl border border-[#edf0eb] bg-[#fbfcf8] px-4 py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-[#365368]">
                    {provider}
                  </p>
                  <p className="mt-1 text-xs text-[#829096]">
                    {configured
                      ? "Ayar kaydı bulundu."
                      : "Yapılandırılmadı; formdan alanları doğrulayın."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={testProviderConnection.isPending}
                  onClick={() => {
                    const key = providerKeyForLabel(provider);
                    setSelectedProvider(key);
                    testProviderConnection.mutate({
                      provider: key,
                      config:
                        key === "s3" ||
                        key === "search-console" ||
                        key.startsWith("google") ||
                        key.startsWith("bunny")
                          ? storageConfig
                          : undefined,
                    });
                  }}
                  className="shrink-0 rounded-xl"
                >
                  {testProviderConnection.isPending
                    ? "Test ediliyor…"
                    : "Bağlantıyı test et"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
      {storageConfig && setStorageConfig && (
        <div className="rounded-[24px] border border-[#e6e5dc] bg-white p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold tracking-[.16em] text-[#668278] uppercase">
                Sağlayıcı yapılandırması
              </p>
              <h3 className="mt-2 text-xl font-bold text-[#29465a]">
                {selectedProvider === "search-console"
                  ? "Google OAuth ve mülk bağlantısı"
                  : "API anahtarı ve depolama alanı"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#71838b]">
                {selectedProvider === "search-console"
                  ? "Client ID, Redirect URL ve mülk URL’sini burada hazırlayın. Client Secret hosting ortam değişkeni olarak girilecek; tarayıcıya veya veritabanına yazılmayacaktır."
                  : "Bu formdaki secret değerler veritabanına yazılmaz; yalnızca bağlantı testi isteğinde sunucuya gönderilir ve yanıtta maskelenir."}
              </p>
            </div>
            <select
              aria-label="Depolama sağlayıcısı"
              value={selectedProvider}
              onChange={event =>
                setSelectedProvider(event.target.value as ProviderKey)
              }
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="s3">S3</option>
              <option value="google-drive-personal">
                Google Drive · Kişisel
              </option>
              <option value="google-drive-workspace">
                Google Drive · Workspace
              </option>
              <option value="bunny-storage">Bunny Storage</option>
              <option value="bunny-stream">Bunny Stream</option>
              <option value="bunny-dns">Bunny DNS</option>
              <option value="bunny-pull-zone">Bunny CDN · Pull Zone</option>
              <option value="search-console">Google Search Console</option>
              <option value="google-analytics">
                Google Analytics / İstatistik
              </option>
              <option value="youtube">YouTube Video</option>
              <option value="video-source">Video URL / Embed</option>
            </select>
          </div>
          {selectedFields.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {selectedFields.map(field => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`cloud-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`cloud-${field.key}`}
                    type={field.secret ? "password" : "text"}
                    value={storageConfig[field.key]}
                    onChange={event =>
                      updateField(field.key, event.target.value)
                    }
                    placeholder={field.placeholder}
                    autoComplete="off"
                    className="h-11 rounded-xl"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-xl bg-[#f7f8f4] p-4 text-sm leading-6 text-[#607781]">
              Bu sağlayıcı için mevcut OAuth veya dahili sunucu bağlantısı
              kullanılır. İlgili karttan bağlantı testini çalıştırın.
            </div>
          )}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-[#829096]">
              Kimlik bilgileri tarayıcıda kalır; sayfa yenilendiğinde
              temizlenir.
            </p>
            <Button
              type="button"
              disabled={testProviderConnection.isPending}
              onClick={() =>
                testProviderConnection.mutate({
                  provider: selectedProvider,
                  config: storageConfig,
                })
              }
              className="rounded-xl bg-[#18344f]"
            >
              {testProviderConnection.isPending
                ? "Alanlar test ediliyor…"
                : "Alanları test et"}
            </Button>
          </div>
        </div>
      )}
      <div className="rounded-[24px] bg-[#18344f] p-6 text-white">
        <p className="text-xs font-bold tracking-[.16em] text-[#a5cac0] uppercase">
          Güvenli hazırlık
        </p>
        <h3 className="mt-3 text-xl font-semibold">
          Secret değerleri yanıta dönmez.
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c8d4d6]">
          Kalıcı bağlantı için hosting ortam değişkenleri veya OAuth bağlantısı
          kullanılmalıdır. Test formu yalnızca Admin’e açıktır ve canlı taşıma
          başlamadan önce eksik alanları bildirir.
        </p>
      </div>
    </section>
  );
}

export default function Panel() {
  return (
          <DashboardLayout
>
      <PanelContent />
    </DashboardLayout>
  );
}
