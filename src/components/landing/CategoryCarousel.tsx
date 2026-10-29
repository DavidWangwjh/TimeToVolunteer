"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { organizationCategories, type OrganizationCategory } from "@/lib/organization-options";

type Category = Exclude<OrganizationCategory, "Other">;
const details: Record<Category, { image: string; title: string; description: string; alt: string; color: string }> = {
  "Animal Welfare": { image: "animal", title: "Animal Shelter Volunteer", description: "Help care for shelter animals, offer companionship, and support their journey to loving homes.", alt: "A volunteer petting a golden retriever", color: "bg-rose-100 text-rose-800" },
  "Arts & Culture": { image: "arts", title: "Bring Creativity to Life", description: "Support local arts, lend a hand at cultural events, and make creative experiences accessible to everyone.", alt: "Volunteers painting a community mural", color: "bg-violet-100 text-violet-800" },
  "Community Development": { image: "community", title: "Build Stronger Communities", description: "Connect with neighbors and help shape welcoming shared spaces through local community projects.", alt: "Neighbors working together in a community garden", color: "bg-teal-100 text-teal-800" },
  Education: { image: "tutoring", title: "Youth Tutoring", description: "Make a difference in students’ lives through tutoring, mentorship, and academic support.", alt: "A volunteer helping a student with a workbook", color: "bg-sky-100 text-sky-800" },
  Environment: { image: "environment", title: "Care for Our Planet", description: "Restore green spaces, join a neighborhood cleanup, and help protect the places we share.", alt: "Volunteers collecting litter in a public park", color: "bg-lime-100 text-lime-800" },
  "Food Security": { image: "food", title: "Food Pantry Volunteer", description: "Help fight hunger by organizing donations and sharing essential food with local families.", alt: "Volunteers packing fresh produce at a food pantry", color: "bg-emerald-100 text-emerald-900" },
  "Health & Wellness": { image: "health", title: "Support Community Wellness", description: "Help at wellness events and connect people with activities that support healthier, happier lives.", alt: "A volunteer welcoming people to a community wellness walk", color: "bg-cyan-100 text-cyan-800" },
  Housing: { image: "housing", title: "Help Make a House a Home", description: "Lend a hand with home improvement projects and support neighbors on their path to stable housing.", alt: "Volunteers repairing and painting a home’s porch", color: "bg-orange-100 text-orange-800" },
  "Senior Services": { image: "seniors", title: "Make Meaningful Connections", description: "Share conversation, help with activities, and bring companionship to older adults in your community.", alt: "A volunteer playing a board game with a senior", color: "bg-amber-100 text-amber-800" },
  "Youth Programs": { image: "youth", title: "Inspire the Next Generation", description: "Support youth activities, encourage new skills, and help young people grow in confidence.", alt: "A volunteer leading teenagers in an outdoor activity", color: "bg-blue-100 text-blue-800" },
};
const categories = organizationCategories.filter((category): category is Category => category !== "Other");
export function CategoryCarousel() {
  const touchStart = useRef<number | null>(null);
  const [active, setActive] = useState(0);
  // Restart the countdown after every automatic or manual slide change.
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timer = window.setInterval(() => {
      if (!document.hidden && !reducedMotion.matches) {
        setActive((current) => (current + 1) % categories.length);
      }
    }, 5500);
    return () => window.clearInterval(timer);
  }, [active]);

  function move(direction: number) {
    setActive((current) => (current + direction + categories.length) % categories.length);
  }

  return (
    <div role="region" aria-roledescription="carousel" aria-label="Volunteer categories">
      <div className="flex items-center justify-between gap-4">
        <h2 id="explore-heading" className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">Explore What’s Possible</h2>
        <div className="flex shrink-0 gap-2">
        <button type="button" aria-label="Previous categories" aria-controls="category-slides" onClick={() => { move(-1); }} className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-700"><ChevronLeft className="size-5" /></button>
        <button type="button" aria-label="Next categories" aria-controls="category-slides" onClick={() => { move(1); }} className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-700"><ChevronRight className="size-5" /></button>
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-600 sm:text-base">Discover meaningful ways to make a difference in your community.</p>
      <div id="category-slides" tabIndex={0} aria-label="Category cards. Use left and right arrow keys to browse." className="grid touch-pan-y grid-cols-1 overflow-hidden px-2 pb-3 pt-2 focus-visible:outline-2 focus-visible:outline-emerald-700"
        onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }}
        onTouchEnd={(event) => {
          if (touchStart.current !== null) {
            const distance = touchStart.current - event.changedTouches[0].clientX;
            if (Math.abs(distance) > 40) move(distance > 0 ? 1 : -1);
          }
          touchStart.current = null;
        }}
        onTouchCancel={() => { touchStart.current = null; }}
        onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); } }}>
        {categories.map((category, index) => {
          const item = details[category];
          const distance = (index - active + categories.length) % categories.length;
          // Keep nearby cards on both sides of the active card. In particular,
          // the next card entering from the left must start at -2, not count - 2.
          const position = distance > categories.length / 2 ? distance - categories.length : distance;
          const focused = position === 0;
          const visible = Math.abs(position) <= 1;
          return <article key={category} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${categories.length}: ${category}`} aria-hidden={!visible} aria-current={focused ? "true" : undefined}
            style={{ transform: `translateX(${position * 102}%) scale(${focused ? 1 : 0.88})` }}
            className={`col-start-1 row-start-1 mx-auto flex min-h-48 w-full items-start gap-4 rounded-2xl border bg-white p-3 md:w-[60%] lg:w-[34%] lg:gap-3 xl:gap-5 motion-safe:transition-[transform,opacity,box-shadow] motion-safe:duration-500 motion-safe:ease-out ${focused ? "z-10 border-emerald-200 shadow-lg shadow-emerald-950/10" : visible ? "border-slate-200/70 opacity-70 shadow-sm" : "pointer-events-none border-slate-200/70 opacity-0"}`}>
            <Image src={`/images/landing/${item.image}.png`} alt={item.alt} width={160} height={170} sizes="(max-width: 640px) 100px, 150px" className="h-40 w-24 shrink-0 rounded-xl object-cover sm:w-36 lg:w-28 xl:w-36" />
            <div className="py-1"><span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${item.color}`}>{category}</span><h3 className="mt-2 text-base font-bold leading-snug">{item.title}</h3><p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.description}</p></div>
          </article>;
        })}
      </div>
      <p className="sr-only" aria-live="off">{categories[active]}, {active + 1} of {categories.length}</p>
    </div>
  );
}
