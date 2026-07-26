"use client";

import React, { useState } from "react";
import type { Article } from "@/lib/types";
import { createClient } from "@supabase/supabase-js";

// Client Supabase sécurisé avec fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder"
);

export interface StockageOption {
  stockage: string;
  prix: number;
  quantite: number;
}

interface ArticleFormProps {
  article: Article | null;
  onClose: () => void;
  onSaved: (article: Article, isNew: boolean) => void;
  onDeactivated?: (id: string) => void;
}

// Helper 1: Extraction sécurisée des paliers de stockage
function parseStockageOptions(rawOptions: unknown): StockageOption[] {
  let opts: unknown = rawOptions;
  if (typeof opts === "string") {
    try {
      opts = JSON.parse(opts);
    } catch {
      opts = [];
    }
  }
  if (Array.isArray(opts) && opts.length > 0) {
    return opts.map((item: any) => ({
      stockage: String(item?.stockage || "Standard"),
      prix: Number(item?.prix) || 0,
      quantite: Number(item?.quantite ?? item?.stock) || 0,
    }));
  }
  return [];
}

// Helper 2: Extraction sécurisée des URLs d'images
function parseImages(rawImages: unknown): string[] {
  if (Array.is
