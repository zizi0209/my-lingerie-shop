"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Tag,
  Sparkles,
  Flame,
  TrendingUp,
  BarChart3,
  ArrowUpDown,
  Check,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface Synonym {
  id: number;
  word: string;
  synonym: string;
  hitCount: number;
  isActive: boolean;
  createdAt: string;
}

interface Keyword {
  id: number;
  keyword: string;
  type: string;
  config: Record<string, unknown>;
  displayName: string;
  icon: string | null;
  order: number;
  isActive: boolean;
  isPinned: boolean;
  createdAt: string;
}

interface Analytics {
  totalSearches: number;
  topKeywords: { keyword: string; count: number; avgResults: number }[];
  noResultKeywords: { keyword: string; count: number }[];
  topSynonyms: { word: string; synonym: string; hitCount: number }[];
}

type TabType = "synonyms" | "keywords" | "analytics";

const ICONS = [
  { value: "tag", label: "Tag", icon: Tag },
  { value: "sparkles", label: "Sparkles", icon: Sparkles },
  { value: "flame", label: "Flame", icon: Flame },
  { value: "trending-up", label: "Trending", icon: TrendingUp },
];

const KEYWORD_TYPES = [
  { value: "FILTER", label: "Bộ lọc (Filter)" },
  { value: "SORT", label: "Sắp xếp (Sort)" },
  { value: "CATEGORY", label: "Danh mục (Category)" },
];

export default function SearchManagement() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("synonyms");
  const [loading, setLoading] = useState(false);

  // Synonyms state
  const [synonyms, setSynonyms] = useState<Synonym[]>([]);
  const [synonymSearch, setSynonymSearch] = useState("");
  const [synonymModal, setSynonymModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    data: Partial<Synonym>;
  }>({ open: false, mode: "create", data: {} });

  // Keywords state
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [keywordModal, setKeywordModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    data: Partial<Keyword>;
  }>({ open: false, mode: "create", data: {} });

  // Analytics state
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsDays, setAnalyticsDays] = useState(7);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // Fetch synonyms
  const fetchSynonyms = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (synonymSearch) params.append("search", synonymSearch);

      const res = await fetch(`${baseUrl}/admin/search/synonyms?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setSynonyms(data.data);
    } catch (err) {
      console.error("Fetch synonyms error:", err);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, token, synonymSearch]);

  // Fetch keywords
  const fetchKeywords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/admin/search/keywords?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setKeywords(data.data);
    } catch (err) {
      console.error("Fetch keywords error:", err);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, token]);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/admin/search/analytics?days=${analyticsDays}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setAnalytics(data.data);
    } catch (err) {
      console.error("Fetch analytics error:", err);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, token, analyticsDays]);

  useEffect(() => {
    if (activeTab === "synonyms") fetchSynonyms();
    else if (activeTab === "keywords") fetchKeywords();
    else if (activeTab === "analytics") fetchAnalytics();
  }, [activeTab, fetchSynonyms, fetchKeywords, fetchAnalytics]);

  // CRUD Synonyms
  const saveSynonym = async () => {
    try {
      const method = synonymModal.mode === "create" ? "POST" : "PUT";
      const url =
        synonymModal.mode === "create"
          ? `${baseUrl}/admin/search/synonyms`
          : `${baseUrl}/admin/search/synonyms/${synonymModal.data.id}`;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(synonymModal.data),
      });

      const data = await res.json();
      if (data.success) {
        setSynonymModal({ open: false, mode: "create", data: {} });
        fetchSynonyms();
      } else {
        alert(data.error || "Có lỗi xảy ra");
      }
    } catch (err) {
      console.error("Save synonym error:", err);
    }
  };

  const deleteSynonym = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa từ đồng nghĩa này?")) return;
    try {
      await fetch(`${baseUrl}/admin/search/synonyms/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchSynonyms();
    } catch (err) {
      console.error("Delete synonym error:", err);
    }
  };

  const toggleSynonymActive = async (synonym: Synonym) => {
    try {
      await fetch(`${baseUrl}/admin/search/synonyms/${synonym.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !synonym.isActive }),
      });
      fetchSynonyms();
    } catch (err) {
      console.error("Toggle synonym error:", err);
    }
  };

  // CRUD Keywords
  const saveKeyword = async () => {
    try {
      const method = keywordModal.mode === "create" ? "POST" : "PUT";
      const url =
        keywordModal.mode === "create"
          ? `${baseUrl}/admin/search/keywords`
          : `${baseUrl}/admin/search/keywords/${keywordModal.data.id}`;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(keywordModal.data),
      });

      const data = await res.json();
      if (data.success) {
        setKeywordModal({ open: false, mode: "create", data: {} });
        fetchKeywords();
      } else {
        alert(data.error || "Có lỗi xảy ra");
      }
    } catch (err) {
      console.error("Save keyword error:", err);
    }
  };

  const deleteKeyword = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa từ khóa này?")) return;
    try {
      await fetch(`${baseUrl}/admin/search/keywords/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchKeywords();
    } catch (err) {
      console.error("Delete keyword error:", err);
    }
  };

  const toggleKeywordActive = async (keyword: Keyword) => {
    try {
      await fetch(`${baseUrl}/admin/search/keywords/${keyword.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !keyword.isActive }),
      });
      fetchKeywords();
    } catch (err) {
      console.error("Toggle keyword error:", err);
    }
  };

  const toggleKeywordPinned = async (keyword: Keyword) => {
    try {
      await fetch(`${baseUrl}/admin/search/keywords/${keyword.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPinned: !keyword.isPinned }),
      });
      fetchKeywords();
    } catch (err) {
      console.error("Toggle pinned error:", err);
    }
  };

  const getIconComponent = (iconName: string | null) => {
    const found = ICONS.find((i) => i.value === iconName);
    return found ? found.icon : Tag;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Quản lý Tìm kiếm
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Quản lý từ đồng nghĩa, từ khóa điều hướng và xem thống kê tìm kiếm
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        {[
          { key: "synonyms", label: "Từ đồng nghĩa", icon: ArrowUpDown },
          { key: "keywords", label: "Từ khóa điều hướng", icon: Tag },
          { key: "analytics", label: "Thống kê", icon: BarChart3 },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabType)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === tab.key
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Synonyms Tab */}
      {activeTab === "synonyms" && !loading && (
        <div>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm từ đồng nghĩa..."
                value={synonymSearch}
                onChange={(e) => setSynonymSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <button
              onClick={() => setSynonymModal({ open: true, mode: "create", data: {} })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              Thêm từ đồng nghĩa
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                    Từ gốc
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                    Từ đồng nghĩa
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                    Lượt dùng
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {synonyms.map((syn) => (
                  <tr key={syn.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                      {syn.word}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      → {syn.synonym}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                      {syn.hitCount}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleSynonymActive(syn)}
                        className={`px-2 py-1 text-xs rounded-full ${
                          syn.isActive
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {syn.isActive ? "Hoạt động" : "Tắt"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            setSynonymModal({ open: true, mode: "edit", data: syn })
                          }
                          className="p-1.5 text-gray-500 hover:text-blue-600 transition"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteSynonym(syn.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {synonyms.length === 0 && (
              <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                Chưa có từ đồng nghĩa nào
              </div>
            )}
          </div>
        </div>
      )}

      {/* Keywords Tab */}
      {activeTab === "keywords" && !loading && (
        <div>
          <div className="flex justify-end mb-6">
            <button
              onClick={() =>
                setKeywordModal({
                  open: true,
                  mode: "create",
                  data: { type: "FILTER", config: {} },
                })
              }
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              Thêm từ khóa
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                    Từ khóa
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                    Tên hiển thị
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                    Loại
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                    Ghim
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {keywords.map((kw) => {
                  const IconComp = getIconComponent(kw.icon);
                  return (
                    <tr key={kw.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                        {kw.keyword}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <IconComp className="w-4 h-4" />
                          {kw.displayName}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          {kw.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleKeywordPinned(kw)}
                          className={`p-1 rounded ${
                            kw.isPinned
                              ? "text-yellow-500"
                              : "text-gray-300 dark:text-gray-600"
                          }`}
                        >
                          {kw.isPinned ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleKeywordActive(kw)}
                          className={`px-2 py-1 text-xs rounded-full ${
                            kw.isActive
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {kw.isActive ? "Hoạt động" : "Tắt"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              setKeywordModal({ open: true, mode: "edit", data: kw })
                            }
                            className="p-1.5 text-gray-500 hover:text-blue-600 transition"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteKeyword(kw.id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {keywords.length === 0 && (
              <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                Chưa có từ khóa nào
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && !loading && analytics && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <select
              value={analyticsDays}
              onChange={(e) => setAnalyticsDays(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value={7}>7 ngày qua</option>
              <option value={14}>14 ngày qua</option>
              <option value={30}>30 ngày qua</option>
            </select>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Tổng lượt tìm kiếm</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {analytics.totalSearches.toLocaleString()}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Từ khóa phổ biến nhất</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {analytics.topKeywords[0]?.keyword || "N/A"}
              </p>
              <p className="text-sm text-gray-500">
                {analytics.topKeywords[0]?.count || 0} lượt
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Tìm kiếm không kết quả</p>
              <p className="text-3xl font-bold text-red-500 mt-1">
                {analytics.noResultKeywords.length}
              </p>
            </div>
          </div>

          {/* Top Keywords */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Top từ khóa tìm kiếm
              </h3>
              <div className="space-y-3">
                {analytics.topKeywords.slice(0, 10).map((kw, idx) => (
                  <div key={kw.keyword} className="flex items-center gap-3">
                    <span className="w-6 text-sm text-gray-400">{idx + 1}</span>
                    <span className="flex-1 text-gray-900 dark:text-white">{kw.keyword}</span>
                    <span className="text-sm text-gray-500">{kw.count} lượt</span>
                    <span className="text-xs text-gray-400">~{kw.avgResults} kết quả</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Tìm kiếm không có kết quả
                <span className="text-sm font-normal text-gray-500 ml-2">
                  (Cần thêm từ đồng nghĩa)
                </span>
              </h3>
              <div className="space-y-3">
                {analytics.noResultKeywords.map((kw) => (
                  <div key={kw.keyword} className="flex items-center gap-3">
                    <span className="flex-1 text-red-600 dark:text-red-400">{kw.keyword}</span>
                    <span className="text-sm text-gray-500">{kw.count} lượt</span>
                    <button
                      onClick={() =>
                        setSynonymModal({
                          open: true,
                          mode: "create",
                          data: { word: kw.keyword },
                        })
                      }
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition"
                    >
                      + Thêm synonym
                    </button>
                  </div>
                ))}
                {analytics.noResultKeywords.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400">Không có</p>
                )}
              </div>
            </div>
          </div>

          {/* Top Synonyms */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Từ đồng nghĩa được sử dụng nhiều nhất
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.topSynonyms.map((syn) => (
                <div
                  key={syn.word}
                  className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <span className="text-gray-900 dark:text-white">{syn.word}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-gray-600 dark:text-gray-400">{syn.synonym}</span>
                  <span className="ml-auto text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
                    {syn.hitCount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Synonym Modal */}
      {synonymModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {synonymModal.mode === "create" ? "Thêm từ đồng nghĩa" : "Sửa từ đồng nghĩa"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Từ gốc (người dùng nhập)
                </label>
                <input
                  type="text"
                  value={synonymModal.data.word || ""}
                  onChange={(e) =>
                    setSynonymModal({
                      ...synonymModal,
                      data: { ...synonymModal.data, word: e.target.value },
                    })
                  }
                  placeholder="vd: bra, quần chíp"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Từ đồng nghĩa (hệ thống tìm)
                </label>
                <input
                  type="text"
                  value={synonymModal.data.synonym || ""}
                  onChange={(e) =>
                    setSynonymModal({
                      ...synonymModal,
                      data: { ...synonymModal.data, synonym: e.target.value },
                    })
                  }
                  placeholder="vd: áo lót, quần lót"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSynonymModal({ open: false, mode: "create", data: {} })}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
              >
                Hủy
              </button>
              <button
                onClick={saveSynonym}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {synonymModal.mode === "create" ? "Thêm" : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyword Modal */}
      {keywordModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {keywordModal.mode === "create" ? "Thêm từ khóa điều hướng" : "Sửa từ khóa"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Từ khóa
                </label>
                <input
                  type="text"
                  value={keywordModal.data.keyword || ""}
                  onChange={(e) =>
                    setKeywordModal({
                      ...keywordModal,
                      data: { ...keywordModal.data, keyword: e.target.value },
                    })
                  }
                  placeholder="vd: sale, hot, new"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Tên hiển thị
                </label>
                <input
                  type="text"
                  value={keywordModal.data.displayName || ""}
                  onChange={(e) =>
                    setKeywordModal({
                      ...keywordModal,
                      data: { ...keywordModal.data, displayName: e.target.value },
                    })
                  }
                  placeholder="vd: Đang giảm giá"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Loại
                  </label>
                  <select
                    value={keywordModal.data.type || "FILTER"}
                    onChange={(e) =>
                      setKeywordModal({
                        ...keywordModal,
                        data: { ...keywordModal.data, type: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    {KEYWORD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Icon
                  </label>
                  <select
                    value={keywordModal.data.icon || "tag"}
                    onChange={(e) =>
                      setKeywordModal({
                        ...keywordModal,
                        data: { ...keywordModal.data, icon: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    {ICONS.map((i) => (
                      <option key={i.value} value={i.value}>
                        {i.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={keywordModal.data.isPinned || false}
                    onChange={(e) =>
                      setKeywordModal({
                        ...keywordModal,
                        data: { ...keywordModal.data, isPinned: e.target.checked },
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Ghim (hiển thị ở tìm kiếm phổ biến)
                  </span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setKeywordModal({ open: false, mode: "create", data: {} })}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
              >
                Hủy
              </button>
              <button
                onClick={saveKeyword}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {keywordModal.mode === "create" ? "Thêm" : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
