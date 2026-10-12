"use client";

import {
  Shirt, Smartphone, Trophy, Gem, Package, Home, Sparkles, Footprints,
  Briefcase, Baby, Droplet, HeartPulse, Gift, Dog, Pencil, Cog, HardHat,
  Sofa, Lightbulb, Microwave, Car, Wrench, Sun, Zap, Shield, CircuitBoard,
  Truck, Wheat, Layers, Handshake, Folder,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  shirt: Shirt,
  smartphone: Smartphone,
  trophy: Trophy,
  gem: Gem,
  package: Package,
  home: Home,
  sparkles: Sparkles,
  footprints: Footprints,
  briefcase: Briefcase,
  baby: Baby,
  droplet: Droplet,
  "heart-pulse": HeartPulse,
  gift: Gift,
  dog: Dog,
  pencil: Pencil,
  cog: Cog,
  "hard-hat": HardHat,
  sofa: Sofa,
  lightbulb: Lightbulb,
  microwave: Microwave,
  car: Car,
  wrench: Wrench,
  sun: Sun,
  zap: Zap,
  shield: Shield,
  "circuit-board": CircuitBoard,
  truck: Truck,
  wheat: Wheat,
  layers: Layers,
  handshake: Handshake,
};

export function CatIcon({
  name,
  className,
}: {
  name?: string | null;
  className?: string;
}) {
  const Icon = (name && MAP[name]) || Folder;
  return <Icon className={className} strokeWidth={1.6} />;
}
