"use client";
import React, { useState, useEffect } from "react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import Image from "next/image";
import { 
  Gavel, Shield, Clock, Award, Heart, MessageCircle, Bookmark, 
  ChevronLeft, ChevronRight, Sparkles, Crown, Gem, ArrowRight, Lock, Star, Zap
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/*
 * GAVEL LANDING PAGE - ENHANCED VERSION
 * Color Palette:
 * #1A3263 - Dark Blue (primary dark)
 * #547792 - Teal (primary accent)
 * #EFD2B0 - Mint (secondary accent)
 * #FFC570 - Light Yellow (highlight)
 */

interface ReelItem {
  id: string;
  title: string;
  price: string;
  timeLeft: string;
  likes: string;
  comments: string;
  verified: boolean;
  live: boolean;
  image: string;
  video?: string;
  category?: string;
}

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [tickerVisible, setTickerVisible] = useState(true);
  const [watchlistIds, setWatchlistIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchReels = async () => {
      const cacheKey = "gavel-landing-reels";
      const cachedReels = window.localStorage.getItem(cacheKey);
      if (cachedReels) {
        try {
          setReels(JSON.parse(cachedReels));
          setIsLoading(false);
        } catch {
          window.localStorage.removeItem(cacheKey);
        }
      }

      try {
        const res = await fetch('/api/auctions');
        const data = await res.json();
        const activeAuctions = data.filter((a: any) => a.status === 'active').map((a: any) => ({
          id: a.id,
          title: a.title,
          price: `₹${a.currentBid.toLocaleString('en-IN')}`,
          timeLeft: "LIVE", // Simplified for marquee
          likes: `${Math.floor(Math.random() * 500)}`,
          comments: `${Math.floor(Math.random() * 50)}`,
          verified: true,
          live: true,
          image: a.image || a.images?.[0],
          video: a.videoUrl || a.verificationVideo || "",
          category: a.category || "Collectibles"
        }));
        const nextReels = activeAuctions;
        setReels(nextReels);
        window.localStorage.setItem(cacheKey, JSON.stringify(nextReels));
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch reels:", error);
        if (!cachedReels) {
          setReels([]);
        }
        setIsLoading(false);
      }
    };
    fetchReels();
  }, []);

  useEffect(() => {
    const fetchWatchlist = async () => {
      if (!user) {
        setWatchlistIds([]);
        return;
      }

      try {
        const res = await fetch('/api/watchlist');
        if (!res.ok) return;
        const data = await res.json();
        setWatchlistIds(data.map((item: any) => item.id));
      } catch (error) {
        console.error("Failed to fetch watchlist:", error);
      }
    };

    fetchWatchlist();
  }, [user]);

  useEffect(() => {
    if (!loading && user) {
      window.location.replace('/explore.html');
    }
  }, [loading, user]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 50) {
        setTickerVisible(false);
      } else {
        setTickerVisible(true);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const nextReel = () => setActiveReelIndex((prev) => (prev + 1) % reels.length);
  const prevReel = () => setActiveReelIndex((prev) => (prev - 1 + reels.length) % reels.length);
  const currentReel = reels[activeReelIndex];
  const tickerItems = reels.slice(0, 8);

  if (!loading && user) {
    return null;
  }

  const handleJoinNow = () => {
    window.location.assign('/signup.html');
  };

  const handleCategoryClick = (category: string) => {
    window.location.assign(`/auction.html?category=${encodeURIComponent(category)}`);
  };

  const handleWatchlistToggle = async (auctionId: string) => {
    if (!user) {
      window.location.assign('/login.html');
      return;
    }

    try {
      const res = await fetch('/api/watchlist/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: auctionId })
      });

      if (!res.ok) {
        if (res.status === 401) {
          window.location.assign('/login.html');
        }
        return;
      }

      const data = await res.json();
      if (data.success) {
        setWatchlistIds((prev) =>
          data.added ? [...new Set([...prev, auctionId])] : prev.filter((id) => id !== auctionId)
        );
      }
    } catch (error) {
      console.error("Failed to update watchlist:", error);
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden md:pl-[18.5rem]" style={{ background: "linear-gradient(180deg, #1A3263 0%, #547792 50%, #EFD2B0 100%)", fontFamily: "var(--font-body)" }}>
      {/* LIVE AUCTION TICKER - Disappears on scroll */}
      <div 
        className={`fixed top-24 left-0 right-0 z-40 py-2 overflow-hidden transition-all duration-500 ease-out md:left-[18.5rem] ${
          tickerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
        }`}
        style={{ background: "rgba(84, 119, 146, 0.15)", borderBottom: "1px solid rgba(239, 210, 176, 0.3)" }}
      >
        <div className="flex animate-marquee whitespace-nowrap">
          {tickerItems.length ? [...tickerItems, ...tickerItems].map((bid, idx) => (
            <div key={idx} className="flex items-center gap-3 mx-8">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#EFD2B0" }} />
              <span className="text-xs" style={{ color: "rgba(237, 247, 189, 0.9)" }}>
                <span style={{ color: "#EFD2B0", fontWeight: 600 }}>{bid.title}</span> - Current bid <span style={{ color: "#FFC570" }}>{bid.price}</span> - Live now
              </span>
            </div>
          )) : (
            <div className="mx-8 text-xs" style={{ color: "rgba(237, 247, 189, 0.9)" }}>
              No live auctions yet. Approve a listing to populate the landing page feed.
            </div>
          )}
        </div>
      </div>

      <nav className="fixed left-4 top-4 bottom-4 z-50 w-56 hidden md:flex flex-col p-4 rounded-[28px]" style={{ background: "rgba(26, 50, 99, 0.9)", backdropFilter: "blur(20px)", border: "1px solid rgba(239, 210, 176, 0.2)", boxShadow: "0 12px 40px rgba(26, 50, 99, 0.5)" }}>
        <div className="flex items-center gap-2 px-3 py-3 rounded-2xl mb-6" style={{ background: "rgba(239, 210, 176, 0.12)" }}>
          <Gavel className="w-5 h-5" style={{ color: "#EFD2B0" }} />
          <span className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.1em" }}>GAVEL</span>
        </div>
        <div className="flex flex-col gap-2">
          {[
            { href: "/auction.html", label: "Auctions" },
            { href: "/explore.html", label: "Explore" },
            { href: "/short-view.html", label: "Shorts" },
            { href: "/workspace/", label: "Workspace" },
            { href: "/sell-product.html", label: "Sell" }
          ].map((item) => (
            <a key={item.href} href={item.href} className="px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-300" style={{ color: "#FFC570", fontFamily: "var(--font-body)", border: "1px solid rgba(239, 210, 176, 0.08)" }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239, 210, 176, 0.14)"; e.currentTarget.style.color = "#EFD2B0"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#FFC570"; }}>
              {item.label}
            </a>
          ))}
        </div>
        <div className="mt-auto">
          {!loading && (
            user ? (
              <div className="space-y-3">
                <div className="px-3 py-3 rounded-2xl" style={{ background: "rgba(239, 210, 176, 0.08)" }}>
                  <div className="text-xs uppercase tracking-[0.24em]" style={{ color: "#547792", fontFamily: "var(--font-body)" }}>Logged in</div>
                  <div className="text-sm mt-1" style={{ color: "#FFC570", fontFamily: "var(--font-body)" }}>{user.name}</div>
                </div>
                <button onClick={logout} className="w-full px-4 py-3 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02]" style={{ background: "linear-gradient(135deg, #EFD2B0 0%, #547792 100%)", color: "#1A3263", fontFamily: "var(--font-body)" }}>Logout</button>
              </div>
            ) : (
              <button onClick={handleJoinNow} className="w-full px-5 py-3 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02]" style={{ background: "linear-gradient(135deg, #EFD2B0 0%, #547792 100%)", color: "#1A3263", fontFamily: "var(--font-body)" }}>Join Now</button>
            )
          )}
        </div>
      </nav>

      {/* HERO - HIGHER POSITION */}
      <section className="pt-24 pb-8 relative md:pt-16">
        <div className="relative z-10">
          <ContainerScroll
            titleComponent={
              <div className="space-y-3 px-4 -mt-12">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mx-auto" style={{ background: "rgba(239, 210, 176, 0.15)", border: "1px solid rgba(239, 210, 176, 0.3)" }}>
                  <Sparkles className="w-3.5 h-3.5" style={{ color: "#EFD2B0" }} />
                  <span className="text-[10px] font-semibold tracking-[0.3em] uppercase" style={{ color: "#EFD2B0", fontFamily: "var(--font-body)" }}>Established 2026</span>
                </div>
                <div className="space-y-1">
                  <h1 className="text-4xl md:text-6xl lg:text-7xl text-white leading-[0.95] tracking-[0.08em]" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>WHERE</h1>
                  <h1 className="text-4xl md:text-6xl lg:text-7xl leading-[0.95] tracking-[0.08em]" style={{ fontFamily: "var(--font-heading)", fontWeight: 500, color: "#EFD2B0" }}>LEGACY</h1>
                  <h1 className="text-4xl md:text-6xl lg:text-7xl text-white leading-[0.95] tracking-[0.08em]" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>MEETS LUXURY</h1>
                </div>
                <p className="text-lg md:text-xl max-w-lg mx-auto pt-2" style={{ color: "#547792", fontFamily: "var(--font-heading)", fontWeight: 500, letterSpacing: "0.05em" }}>Curated auctions for the discerning collector</p>
                <p className="text-sm max-w-md mx-auto" style={{ color: "rgba(237, 247, 189, 0.9)", fontFamily: "var(--font-body)", fontSize: "1.05rem" }}>Experience the worlds most prestigious marketplace for fine art, timepieces, and rare collectibles. Every piece authenticated. Every bid matters.</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <button onClick={() => window.location.href = '/auction.html'} className="group px-8 py-3.5 rounded-full font-semibold text-sm transition-all hover:scale-105 flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #EFD2B0 0%, #547792 100%)", color: "#1A3263", fontFamily: "var(--font-body)", boxShadow: "0 4px 20px rgba(239, 210, 176, 0.4)" }}>Explore Collection<ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></button>
                  <button onClick={() => window.location.href = '/auction.html'} className="px-8 py-3.5 rounded-full font-semibold text-sm transition-all hover:scale-105" style={{ background: "transparent", border: "1px solid rgba(239, 210, 176, 0.5)", color: "#EFD2B0", fontFamily: "var(--font-body)" }}>View Live Auctions</button>
                </div>
                <div className="flex items-center justify-center gap-6 pt-2 text-xs" style={{ color: "#FFC570", fontFamily: "var(--font-body)" }}>
                  <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" style={{ color: "#EFD2B0" }} />Verified Authentic</span>
                  <span className="w-1 h-1 rounded-full bg-[#547792]" />
                  <span className="flex items-center gap-1.5"><Crown className="w-3.5 h-3.5" style={{ color: "#EFD2B0" }} />White Glove Service</span>
                  <span className="w-1 h-1 rounded-full bg-[#547792]" />
                  <span className="flex items-center gap-1.5"><Gem className="w-3.5 h-3.5" style={{ color: "#EFD2B0" }} />Global Shipping</span>
                </div>
              </div>
            }
          >
            <div className="relative w-full h-full overflow-hidden rounded-2xl" style={{ background: "#1A3263" }}>
              {isLoading ? (
                <div className="flex items-center justify-center h-full"><div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#EFD2B0", borderTopColor: "transparent" }} /></div>
              ) : reels.length > 0 ? (
                <div className="relative w-full h-full">
                  {currentReel.video ? (
                    <video
                      key={currentReel.id}
                      src={currentReel.video}
                      poster={currentReel.image}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <Image src={currentReel.image} alt={currentReel.title} fill className="object-cover" priority />
                  )}
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(26, 50, 99, 0.95) 0%, rgba(84, 119, 146, 0.4) 50%, transparent 100%)" }} />
                  {currentReel.live && <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(239, 210, 176, 0.95)" }}><span className="w-2 h-2 bg-white rounded-full animate-pulse" /><span className="text-white text-xs font-bold tracking-wider" style={{ fontFamily: "var(--font-body)" }}>LIVE</span></div>}
                  <div className="absolute bottom-0 left-0 p-6 w-full">
                    <div className="flex items-end justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold px-2 py-1 rounded tracking-wider" style={{ background: "rgba(239, 210, 176, 0.25)", color: "#EFD2B0", fontFamily: "var(--font-body)" }}>LOT {currentReel.id}</span>
                          {currentReel.verified && <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded tracking-wider" style={{ background: "linear-gradient(135deg, #EFD2B0 0%, #547792 100%)", color: "#1A3263", fontFamily: "var(--font-body)" }}><Shield className="w-3 h-3" /> VERIFIED</span>}
                          <span className="text-[10px] font-bold px-2 py-1 rounded tracking-wider" style={{ background: "rgba(239, 210, 176, 0.12)", color: "#FFC570", fontFamily: "var(--font-body)" }}>{currentReel.category}</span>
                        </div>
                        <h3 className="text-lg md:text-xl text-white mb-1 tracking-wide" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>{currentReel.title}</h3>
                        <p className="text-xl md:text-2xl tracking-wider" style={{ color: "#EFD2B0", fontFamily: "var(--font-heading)", fontWeight: 500 }}>{currentReel.price}</p>
                        <p className="text-xs mt-2 tracking-wider" style={{ color: "#547792", fontFamily: "var(--font-body)" }}>ENDS IN {currentReel.timeLeft}</p>
                      </div>
                      <div className="flex flex-col items-center gap-3 ml-4">
                        <button className="flex flex-col items-center gap-1" style={{ color: "white" }}><div className="p-2.5 rounded-full" style={{ background: "rgba(239, 210, 176, 0.2)" }}><Heart className="w-5 h-5" style={{ color: "#EFD2B0" }} /></div><span className="text-[10px] tracking-wider" style={{ color: "#FFC570", fontFamily: "var(--font-body)" }}>{currentReel.likes}</span></button>
                        <button
                          onClick={() => handleWatchlistToggle(currentReel.id)}
                          className="flex flex-col items-center gap-1"
                          style={{ color: "white" }}
                          aria-label="Add to watchlist"
                        >
                          <div className="p-2.5 rounded-full" style={{ background: watchlistIds.includes(currentReel.id) ? "rgba(239, 210, 176, 0.45)" : "rgba(239, 210, 176, 0.2)" }}>
                            <Bookmark className="w-5 h-5" style={{ color: watchlistIds.includes(currentReel.id) ? "#FFC570" : "#EFD2B0", fill: watchlistIds.includes(currentReel.id) ? "#FFC570" : "transparent" }} />
                          </div>
                        </button>
                      </div>
                    </div>
                    <button onClick={() => window.location.assign(`/item-detail.html?id=${currentReel.id}`)} className="w-full mt-4 py-3 rounded-full font-semibold text-sm tracking-wider transition-all hover:scale-[1.02]" style={{ background: "linear-gradient(135deg, #EFD2B0 0%, #547792 100%)", color: "#1A3263", fontFamily: "var(--font-body)", boxShadow: "0 4px 20px rgba(239, 210, 176, 0.4)" }}>PLACE BID</button>
                  </div>
                  <button onClick={prevReel} className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full transition-all hover:scale-110" style={{ background: "rgba(26, 50, 99, 0.85)", backdropFilter: "blur(10px)", border: "1px solid rgba(239, 210, 176, 0.3)" }}><ChevronLeft className="w-5 h-5" style={{ color: "#EFD2B0" }} /></button>
                  <button onClick={nextReel} className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full transition-all hover:scale-110" style={{ background: "rgba(26, 50, 99, 0.85)", backdropFilter: "blur(10px)", border: "1px solid rgba(239, 210, 176, 0.3)" }}><ChevronRight className="w-5 h-5" style={{ color: "#EFD2B0" }} /></button>
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {reels.map((_, idx) => <button key={idx} onClick={() => setActiveReelIndex(idx)} className="h-1 rounded-full transition-all" style={{ background: idx === activeReelIndex ? "#EFD2B0" : "rgba(239, 210, 176, 0.3)", width: idx === activeReelIndex ? "24px" : "6px" }} />)}
                  </div>
                </div>
              ) : <div className="flex items-center justify-center h-full text-center px-8" style={{ color: "#FFC570", fontFamily: "var(--font-body)" }}>No approved live auctions yet. Create and approve a listing to populate the landing page.</div>}
            </div>
          </ContainerScroll>
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="discover" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-[10px] font-semibold tracking-[0.4em] uppercase" style={{ color: "#EFD2B0", fontFamily: "var(--font-montserrat)" }}>Curated Collections</span>
            <h2 className="text-3xl md:text-4xl text-white mt-3 tracking-[0.06em]" style={{ fontFamily: "var(--font-gravitas)", fontWeight: 400 }}>Discover by Category</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat, idx) => (
              <button key={idx} type="button" onClick={() => handleCategoryClick(cat.name)} className="group relative overflow-hidden rounded-xl cursor-pointer transition-transform hover:-translate-y-1 text-left" style={{ aspectRatio: "3/4" }}>
                  <Image src={cat.image} alt={cat.name} fill className="object-cover transition-transform group-hover:scale-110" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(26, 50, 99, 0.95) 0%, transparent 60%)" }} />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-lg tracking-wider text-white" style={{ fontFamily: "var(--font-gravitas)", fontWeight: 400 }}>{cat.name}</h3>
                  <p className="text-xs mt-1" style={{ color: "#547792", fontFamily: "var(--font-montserrat)" }}>{cat.count} items</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* REELS MARQUEE SECTION - NEW HIGHER DENSITY */}
      <section className="py-20 border-y" style={{ background: "rgba(26, 50, 99, 0.4)", borderColor: "rgba(239, 210, 176, 0.15)" }}>
        <div className="px-6 mb-12 text-center">
          <span className="text-[10px] font-semibold tracking-[0.4em] uppercase" style={{ color: "#EFD2B0", fontFamily: "var(--font-montserrat)" }}>Watch It Live</span>
          <h2 className="text-3xl md:text-5xl text-white mt-3 tracking-[0.06em]" style={{ fontFamily: "var(--font-gravitas)", fontWeight: 400 }}>Trending Discovery</h2>
          <p className="text-sm mt-4 max-w-xl mx-auto" style={{ color: "#547792", fontFamily: "var(--font-montserrat)" }}>High-velocity luxury auctions happening right now. Experience the thrill of real-time bidding.</p>
        </div>

        <div className="reels-marquee-container">
          <div className="reels-marquee-track">
            {/* Double the list for infinite scroll effect */}
            {[...reels, ...reels, ...reels, ...reels].map((reel, idx) => (
              <div key={idx} className="marquee-item px-2">
                <div 
                  className="short-card relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer border border-white/5 bg-black"
                  onClick={() => window.location.href = `/short-view.html?id=${reel.id}`}
                >
                  {reel.video ? (
                    <video
                      src={reel.video}
                      poster={reel.image}
                      muted
                      loop
                      playsInline
                      autoPlay
                      className="absolute inset-0 h-full w-full object-cover opacity-80"
                    />
                  ) : (
                    <Image src={reel.image} alt={reel.title} fill className="object-cover opacity-80" />
                  )}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleWatchlistToggle(reel.id);
                    }}
                    className="absolute top-3 left-3 z-10 p-2 rounded-full"
                    style={{ background: "rgba(26, 50, 99, 0.75)", border: "1px solid rgba(239, 210, 176, 0.2)" }}
                    aria-label="Add to watchlist"
                  >
                    <Bookmark className="w-4 h-4" style={{ color: watchlistIds.includes(reel.id) ? "#FFC570" : "#EFD2B0", fill: watchlistIds.includes(reel.id) ? "#FFC570" : "transparent" }} />
                  </button>
                  {reel.live && <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-600/90 backdrop-blur-sm"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /><span className="text-[8px] font-bold text-white tracking-widest">LIVE</span></div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-4">
                    <p className="text-[10px] font-bold text-white mb-0.5 truncate">{reel.title}</p>
                    <p className="text-xs font-black text-[#FFC570]">{reel.price}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>



      <section className="py-24 px-6" style={{ background: "rgba(26, 50, 99, 0.45)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-[10px] font-semibold tracking-[0.4em] uppercase" style={{ color: "#EFD2B0", fontFamily: "var(--font-montserrat)" }}>Bid With Clarity</span>
            <h2 className="text-3xl md:text-5xl text-white mt-3 tracking-[0.06em]" style={{ fontFamily: "var(--font-gravitas)", fontWeight: 400 }}>Everything You Need To Join A Live Auction</h2>
            <p className="text-sm mt-4 max-w-2xl mx-auto" style={{ color: "rgba(237, 247, 189, 0.9)", fontFamily: "var(--font-montserrat)" }}>
              Explore active lots, save items to your watchlist, and jump into verified bidding flows without leaving the main experience.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <Shield className="w-6 h-6" />, title: "Verified Lots", desc: "Every listing surfaces trust, category, and media details before you bid." },
              { icon: <Bookmark className="w-6 h-6" />, title: "Watchlist Ready", desc: "Save promising items from the landing page and revisit them from your dashboard." },
              { icon: <Zap className="w-6 h-6" />, title: "Real-Time Bidding", desc: "Move from discovery to live auction pages with filters, timers, and lot details intact." }
            ].map((feature, idx) => (
              <div key={idx} className="p-6 rounded-2xl" style={{ background: "rgba(26, 50, 99, 0.7)", border: "1px solid rgba(239, 210, 176, 0.2)" }}>
                <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center" style={{ background: "rgba(239, 210, 176, 0.16)", color: "#EFD2B0" }}>{feature.icon}</div>
                <h3 className="text-lg mb-2 text-white" style={{ fontFamily: "var(--font-gravitas)", fontWeight: 400 }}>{feature.title}</h3>
                <p className="text-sm" style={{ color: "#547792", fontFamily: "var(--font-montserrat)" }}>{feature.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <button onClick={() => window.location.assign('/auction.html')} className="px-8 py-3.5 rounded-full font-semibold text-sm transition-all hover:scale-105" style={{ background: "linear-gradient(135deg, #EFD2B0 0%, #547792 100%)", color: "#1A3263", fontFamily: "var(--font-montserrat)" }}>
              Browse Live Auctions
            </button>
            <button onClick={handleJoinNow} className="px-8 py-3.5 rounded-full font-semibold text-sm transition-all hover:scale-105" style={{ background: "transparent", border: "1px solid rgba(239, 210, 176, 0.5)", color: "#EFD2B0", fontFamily: "var(--font-montserrat)" }}>
              Create Account
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 px-6" style={{ borderTop: "1px solid rgba(239, 210, 176, 0.2)", background: "rgba(26, 50, 99, 0.3)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Gavel className="w-5 h-5" style={{ color: "#EFD2B0" }} />
              <span className="text-lg text-white tracking-[0.1em]" style={{ fontFamily: "var(--font-gravitas)", fontWeight: 500 }}>GAVEL</span>
            </div>
            <div className="flex gap-8">
              {["About", "Auctions", "Sell", "Contact"].map((link) => {
                const target = link === "Auctions" ? "/auction.html" : link === "Sell" ? "/sell-product.html" : "#";
                return <a key={link} href={target} className="text-xs tracking-wider transition-colors hover:text-white" style={{ color: "#547792", fontFamily: "var(--font-montserrat)" }}>{link}</a>;
              })}
            </div>
            <p className="text-xs tracking-wider" style={{ color: "#547792", fontFamily: "var(--font-montserrat)" }}>© 2026 Gavel. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

const categories = [
  { name: "Electronics", count: "240", image: "/images/product-headphones.png" },
  { name: "Art", count: "186", image: "/images/auction-products.png" },
  { name: "Vehicles", count: "42", image: "/images/product-laptop.png" },
  { name: "Fashion", count: "95", image: "/images/product-sneakers.png" },
  { name: "Collectibles", count: "164", image: "/images/auction-hero.png" },
  { name: "Jewellery", count: "88", image: "/images/hero-gavel.png" },
  { name: "Real Estate", count: "28", image: "/images/sell-hero.png" },
  { name: "Antiques", count: "73", image: "/images/logo.png" },
  { name: "Watches", count: "61", image: "/images/auction-products.png" },
  { name: "Books", count: "54", image: "/images/product-laptop.png" },
  { name: "Sports Memorabilia", count: "47", image: "/images/product-sneakers.png" },
  { name: "Music", count: "39", image: "/images/product-headphones.png" },
];

const trustFeatures = [
  { icon: <Shield className="w-5 h-5" />, title: "Authentication", description: "Every piece verified by certified experts with comprehensive documentation." },
  { icon: <Crown className="w-5 h-5" />, title: "White Glove", description: "End-to-end concierge service handling shipping, insurance, and delivery." },
  { icon: <Gem className="w-5 h-5" />, title: "Global Reach", description: "Connect with collectors worldwide through our secure bidding platform." }
];

const stats = [
  { value: "98%", label: "SATISFACTION" },
  { value: "50K+", label: "ITEMS SOLD" },
  { value: "₹500Cr", label: "AUCTION VALUE" },
  { value: "24/7", label: "SUPPORT" }
];

const steps = [
  { title: "Register", description: "Create your account and complete verification to start bidding on exclusive items." },
  { title: "Bid", description: "Place bids in real-time or set maximum proxy bids for seamless participation." },
  { title: "Collect", description: "Win your item and receive it with our white-glove delivery service." }
];
