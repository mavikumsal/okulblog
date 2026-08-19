import { useAuth } from "@/_core/hooks/useAuth";
import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { BarChart3, CalendarDays, FileText, FolderTree, LayoutDashboard, LogOut, PanelLeft, Search, Settings, ShieldCheck, Sparkles, Target, Users, SlidersHorizontal, Building2, Newspaper, Gamepad2, Video, ClipboardList, Cloud, Megaphone, SearchCheck, Heart, MessageCircle, ChevronDown, ExternalLink, Bell, Sun, Moon, ScrollText } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { getPanelPathname } from "@shared/panelRoute";

const menuItems = [
  { icon: LayoutDashboard, label: "Genel Bakış", path: "/panel" },
  { icon: FolderTree, label: "Kategoriler", path: "/panel/kategoriler" },
  { icon: Building2, label: "Kurum Kategorisi", path: "/panel/kurum-kategorisi", adminOnly: true },
  { icon: Target, label: "Soru Havuzu", path: "/panel/soru-havuzu" },
  { icon: MessageCircle, label: "Soru-Cevap", path: "/panel/soru-cevap", adminOnly: true },
  { icon: ClipboardList, label: "Testler", path: "/panel/testler", adminOnly: true },
  { icon: FileText, label: "Dokümanlar", path: "/panel/dokumanlar", adminOnly: true },
  { icon: Video, label: "Videolar", path: "/panel/videolar", adminOnly: true },
  { icon: SlidersHorizontal, label: "Simülasyonlar", path: "/panel/simulasyonlar", adminOnly: true },
  { icon: Gamepad2, label: "Oyunlar", path: "/panel/oyunlar", adminOnly: true },
  { icon: Newspaper, label: "Haberler", path: "/panel/haberler", adminOnly: true },
  { icon: FileText, label: "İçerik Yönetimi", path: "/panel/icerikler" },
  { icon: Sparkles, label: "AI Oluşturucu", path: "/panel/ai" },
  { icon: Users, label: "Üye Yönetimi", path: "/panel/uyeler", adminOnly: true },
  { icon: Heart, label: "Üye Panelim", path: "/panel/uye-paneli" },
  { icon: BarChart3, label: "İstatistikler", path: "/panel/istatistikler", adminOnly: true },
  { icon: ShieldCheck, label: "Güvenlik", path: "/panel/guvenlik", adminOnly: true },
  { icon: ScrollText, label: "Denetim Günlüğü", path: "/panel/audit", adminOnly: true },
  { icon: Cloud, label: "Bulut Depolama", path: "/panel/bulut-depolama", adminOnly: true },
  { icon: Megaphone, label: "Reklam Alanı", path: "/panel/reklam", adminOnly: true },
  { icon: SearchCheck, label: "Google Search Console", path: "/panel/search-console", adminOnly: true },
  { icon: Settings, label: "Site Ayarları", path: "/panel/ayarlar", adminOnly: true },
  { icon: SlidersHorizontal, label: "Ana Sayfa Yönetimi", path: "/panel/ana-sayfa-yonetimi", adminOnly: true },
];

function menuGroup(label: string) {
  if (label === "Genel Bakış") return "Genel";
  if (["AI Oluşturucu", "İstatistikler"].includes(label)) return "Üretim ve İçgörü";
  if (["Üye Yönetimi", "Üye Panelim", "Güvenlik", "Denetim Günlüğü", "Bulut Depolama", "Reklam Alanı", "Google Search Console", "Site Ayarları", "Ana Sayfa Yönetimi"].includes(label)) return "Yönetim";
  return "İçerik Merkezi";
}

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Panele giriş yapın
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Bu kontrol paneli yetkilendirilmiş kullanıcılar içindir. Devam etmek için giriş yapın.
            </p>
          </div>
          <Button
            onClick={() => startLogin()}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Giriş yap
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === getPanelPathname(location));
  const accessibleSections = trpc.panel.accessibleSections.useQuery(undefined, { enabled: Boolean(user) });
  const visibleMenuItems = menuItems.filter(item => {
    if (item.adminOnly) return user?.role === "admin";
    if (user?.role === "admin") return true;
    const visible = accessibleSections.data ?? [];
    if (item.label === "Genel Bakış") return true;
    if (item.label === "Kategoriler") return (visible as string[]).includes("Kategoriler") || (visible as string[]).includes("Kurum Kategorisi");
    if (item.label === "Soru Havuzu" || item.label === "AI Oluşturucu") return (visible as string[]).includes("Soru Havuzu");
    if (item.label === "İçerikler") return ["Testler", "Dokümanlar", "Videolar", "Simülasyonlar", "Oyunlar", "Haberler"].some(section => (visible as string[]).includes(section));
    return false;
  });

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
          <Sidebar
            collapsible="icon"
            className="border-r border-[#dfe4e6] bg-[#f8faf9]"
            disableTransition={isResizing}
          >
            <SidebarHeader className="h-[76px] justify-center border-b border-[#e7ecec] bg-[#f8faf9]">
              <div className="flex items-center gap-3 px-3 transition-all w-full">
                <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tracking-tight truncate">
                    okul<span className="font-serif italic text-[#8f7027]">blog</span>
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {visibleMenuItems.map((item, index) => {
                const isActive = location === item.path;
                const group = menuGroup(item.label);
                const previousGroup = index > 0 ? menuGroup(visibleMenuItems[index - 1].label) : undefined;
                return (
                  <React.Fragment key={item.path}>
                    {group !== previousGroup && <li className="px-3 pb-2 pt-4 first:pt-2 group-data-[collapsible=icon]:hidden"><span className="text-[10px] font-black uppercase tracking-[.16em] text-[#9aa8a5]">{group}</span></li>}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 rounded-xl transition-all font-medium ${isActive ? "bg-[#193f59] text-white shadow-sm hover:bg-[#193f59] hover:text-white" : "text-[#52666c] hover:bg-[#e9f0ee] hover:text-[#193f59]"}`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-[#e4b45b]" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  </React.Fragment>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-[#e7ecec] bg-[#f8faf9] p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      O
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      OkulBlog hesabı
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      Hesap seçenekleri
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Çıkış yap</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="bg-[#f6f8f7]">
        <header className="sticky top-0 z-40 flex min-h-[76px] items-center justify-between gap-4 border-b border-[#e1e7e6] bg-[#fbfcfb]/95 px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="h-9 w-9 rounded-xl border border-[#e0e7e5] bg-white text-[#193f59] shadow-sm hover:bg-[#edf3f1]" />
            <div className="hidden min-w-0 items-center gap-2 text-sm text-[#7a898c] sm:flex">
              <span>Yönetim</span>
              <span className="text-[#c4cecc]">/</span>
              <span className="truncate font-semibold text-[#193f59]">{activeMenuItem?.label ?? "Genel Bakış"}</span>
            </div>
            <div className="flex min-w-0 flex-col sm:hidden">
              <span className="truncate text-sm font-semibold text-[#193f59]">{activeMenuItem?.label ?? "Genel Bakış"}</span>
              <span className="text-[11px] text-[#7a898c]">OkulBlog Yönetim Paneli</span>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <label className="hidden h-9 min-w-0 items-center gap-2 rounded-xl border border-[#e0e7e5] bg-white px-3 text-[#7a898c] lg:flex lg:w-52 xl:w-64"><Search className="h-4 w-4 shrink-0" /><input value={globalSearch} onChange={event => setGlobalSearch(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && globalSearch.trim()) setLocation(`/panel/icerikler?search=${encodeURIComponent(globalSearch.trim())}`); }} placeholder="Panelde ara..." aria-label="Panelde ara" className="min-w-0 flex-1 bg-transparent text-xs text-[#193f59] outline-none placeholder:text-[#a0aeae]" /></label>
            <div className="hidden items-center gap-1 rounded-xl border border-[#e0e7e5] bg-white px-2 py-1.5 text-[#65777b] xl:flex" aria-label="Tarih aralığı"><CalendarDays className="h-3.5 w-3.5" /><input type="date" aria-label="Başlangıç tarihi" className="w-[92px] bg-transparent text-[10px] outline-none" /><span className="text-[#c4cecc]">–</span><input type="date" aria-label="Bitiş tarihi" className="w-[92px] bg-transparent text-[10px] outline-none" /></div>
            <button aria-label={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"} onClick={() => toggleTheme?.()} className="hidden h-9 w-9 items-center justify-center rounded-xl border border-[#e0e7e5] bg-white text-[#65777b] transition-colors hover:bg-[#edf3f1] hover:text-[#193f59] sm:flex">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button aria-label="Bildirimler" className="relative hidden h-9 w-9 items-center justify-center rounded-xl border border-[#e0e7e5] bg-white text-[#65777b] transition-colors hover:bg-[#edf3f1] hover:text-[#193f59] sm:flex">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#c39a3d]" />
            </button>
            <button onClick={() => setLocation("/")} className="hidden items-center gap-2 rounded-xl border border-[#e0e7e5] bg-white px-3 py-2 text-xs font-semibold text-[#52666c] transition-colors hover:border-[#c39a3d] hover:text-[#193f59] sm:flex">
              <ExternalLink className="h-3.5 w-3.5" />
              Siteyi görüntüle
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-xl border border-[#e0e7e5] bg-white px-2.5 py-1.5 text-left transition-colors hover:border-[#c39a3d] sm:px-3">
                  <Avatar className="h-8 w-8 border border-[#dfe7e3] bg-[#e9f2ef]"><AvatarFallback className="bg-[#e9f2ef] text-xs font-bold text-[#193f59]">O</AvatarFallback></Avatar>
                  <span className="hidden max-w-28 truncate text-xs font-semibold text-[#193f59] md:block">Hesabım</span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#7a898c]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl border-[#e1e7e6] bg-white p-1.5 shadow-lg">
                <DropdownMenuItem onClick={() => setLocation("/")} className="cursor-pointer rounded-lg text-[#52666c] focus:bg-[#edf3f1] focus:text-[#193f59]"><ExternalLink className="mr-2 h-4 w-4" />Siteyi görüntüle</DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="cursor-pointer rounded-lg text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />Çıkış yap</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </>
  );
}
