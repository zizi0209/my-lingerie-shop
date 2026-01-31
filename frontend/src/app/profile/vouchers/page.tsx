"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Ticket,
  Gift,
  Coins,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Tag,
  ArrowLeft,
  Percent,
} from "lucide-react";
import { userVoucherApi, type UserCoupon, type PointInfo, type PointReward } from "@/lib/couponApi";

export default function VouchersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"wallet" | "collect" | "points">("wallet");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Wallet data
  const [myVouchers, setMyVouchers] = useState<UserCoupon[]>([]);

  // Public vouchers
  const [publicVouchers, setPublicVouchers] = useState<UserCoupon["coupon"][]>([]);
  const [collectingCode, setCollectingCode] = useState<string | null>(null);

  // Points data
  const [pointInfo, setPointInfo] = useState<PointInfo | null>(null);
  const [rewards, setRewards] = useState<PointReward[]>([]);
  const [redeemingId, setRedeemingId] = useState<number | null>(null);

  // Input for manual code
  const [manualCode, setManualCode] = useState("");

  // Fetch wallet
  const fetchWallet = useCallback(async () => {
    try {
      const response = await userVoucherApi.getMyVouchers();
      if (response.success) {
        setMyVouchers(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch wallet:", err);
    }
  }, []);

  // Fetch public vouchers
  const fetchPublicVouchers = useCallback(async () => {
    try {
      const response = await userVoucherApi.getPublicVouchers();
      if (response.success) {
        setPublicVouchers(response.data as unknown as UserCoupon["coupon"][]);
      }
    } catch (err) {
      console.error("Failed to fetch public vouchers:", err);
    }
  }, []);

  // Fetch points
  const fetchPoints = useCallback(async () => {
    try {
      const [pointsRes, rewardsRes] = await Promise.all([
        userVoucherApi.getMyPoints(),
        userVoucherApi.getRewards(),
      ]);
      if (pointsRes.success) {
        setPointInfo(pointsRes.data);
      }
      if (rewardsRes.success) {
        setRewards(rewardsRes.data as unknown as PointReward[]);
      }
    } catch (err) {
      console.error("Failed to fetch points:", err);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/login-register");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchWallet(), fetchPublicVouchers(), fetchPoints()]);
      setLoading(false);
    };

    fetchData();
  }, [authLoading, isAuthenticated, router, fetchWallet, fetchPublicVouchers, fetchPoints]);

  // Collect voucher
  const handleCollect = async (code: string) => {
    setCollectingCode(code);
    setError(null);
    try {
      const response = await userVoucherApi.collectVoucher(code);
      if (response.success) {
        setSuccess("Da luu ma giam gia vao vi!");
        setTimeout(() => setSuccess(null), 3000);
        fetchWallet();
        fetchPublicVouchers();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Loi khi luu ma";
      setError(message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setCollectingCode(null);
    }
  };

  // Collect manual code
  const handleManualCollect = async () => {
    if (!manualCode.trim()) return;
    await handleCollect(manualCode.trim().toUpperCase());
    setManualCode("");
  };

  // Redeem reward
  const handleRedeem = async (rewardId: number) => {
    setRedeemingId(rewardId);
    setError(null);
    try {
      const response = await userVoucherApi.redeemReward(rewardId);
      if (response.success) {
        setSuccess(response.message);
        setTimeout(() => setSuccess(null), 3000);
        fetchPoints();
        fetchWallet();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Loi khi doi qua";
      setError(message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setRedeemingId(null);
    }
  };

  // Copy code
  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setSuccess("Da copy ma!");
    setTimeout(() => setSuccess(null), 2000);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Khong gioi han";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  // Format discount
  const formatDiscount = (coupon: UserCoupon["coupon"]) => {
    if (coupon.discountType === "PERCENTAGE") {
      return `${coupon.discountValue}%${coupon.maxDiscount ? ` (max ${formatCurrency(coupon.maxDiscount)})` : ""}`;
    }
    if (coupon.discountType === "FIXED_AMOUNT") {
      return formatCurrency(coupon.discountValue);
    }
    return "Mien phi ship";
  };

  // Get tier color
  const getTierColor = (tier: string) => {
    switch (tier) {
      case "PLATINUM":
        return "text-purple-600 bg-purple-100";
      case "GOLD":
        return "text-yellow-600 bg-yellow-100";
      case "SILVER":
        return "text-gray-600 bg-gray-200";
      default:
        return "text-orange-600 bg-orange-100";
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lai trang ca nhan
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Ticket className="w-7 h-7 text-primary" />
            Vi Voucher & Diem thuong
          </h1>
        </div>

        {/* Success/Error messages */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("wallet")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "wallet"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Ticket className="w-4 h-4 inline mr-2" />
            Vi cua toi ({myVouchers.length})
          </button>
          <button
            onClick={() => setActiveTab("collect")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "collect"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Gift className="w-4 h-4 inline mr-2" />
            Nhan voucher
          </button>
          <button
            onClick={() => setActiveTab("points")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "points"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Coins className="w-4 h-4 inline mr-2" />
            Diem thuong
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "wallet" && (
          <div className="space-y-4">
            {myVouchers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Ban chua co voucher nao</p>
                <button
                  onClick={() => setActiveTab("collect")}
                  className="mt-4 text-primary hover:underline"
                >
                  Nhan voucher ngay
                </button>
              </div>
            ) : (
              myVouchers.map((uc) => (
                <div
                  key={uc.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex items-center gap-4"
                >
                  <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                    {uc.coupon.discountType === "PERCENTAGE" ? (
                      <Percent className="w-8 h-8 text-primary" />
                    ) : (
                      <Tag className="w-8 h-8 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {uc.coupon.name}
                    </h3>
                    <p className="text-sm text-primary font-medium">
                      {formatDiscount(uc.coupon)}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                      {uc.coupon.minOrderValue && (
                        <span>Don toi thieu: {formatCurrency(uc.coupon.minOrderValue)}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        HSD: {formatDate(uc.expiresAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
                      {uc.coupon.code}
                    </code>
                    <button
                      onClick={() => handleCopy(uc.coupon.code)}
                      className="text-xs text-gray-500 hover:text-primary flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "collect" && (
          <div className="space-y-6">
            {/* Manual input */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                Nhap ma giam gia
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="Nhap ma tai day..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                />
                <button
                  onClick={handleManualCollect}
                  disabled={!manualCode.trim() || collectingCode !== null}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {collectingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : "Luu"}
                </button>
              </div>
            </div>

            {/* Public vouchers */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                Voucher co san
              </h3>
              {publicVouchers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Hien khong co voucher moi
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {publicVouchers.map((voucher) => {
                    const alreadyCollected = myVouchers.some(
                      (uc) => uc.coupon.code === voucher.code
                    );
                    return (
                      <div
                        key={voucher.id}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {voucher.name}
                          </h4>
                          <span className="text-primary font-bold">
                            {voucher.discountType === "PERCENTAGE"
                              ? `${voucher.discountValue}%`
                              : formatCurrency(voucher.discountValue)}
                          </span>
                        </div>
                        {voucher.description && (
                          <p className="text-sm text-gray-500 mb-2">{voucher.description}</p>
                        )}
                        <div className="text-xs text-gray-500 mb-3">
                          {voucher.minOrderValue && (
                            <span>Don toi thieu: {formatCurrency(voucher.minOrderValue)}</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleCollect(voucher.code)}
                          disabled={alreadyCollected || collectingCode === voucher.code}
                          className={`w-full py-2 rounded-lg font-medium ${
                            alreadyCollected
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-primary text-white hover:bg-primary/90"
                          }`}
                        >
                          {collectingCode === voucher.code ? (
                            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                          ) : alreadyCollected ? (
                            "Da luu"
                          ) : (
                            "Luu vao vi"
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "points" && (
          <div className="space-y-6">
            {/* Points summary */}
            {pointInfo && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getTierColor(
                        pointInfo.tier
                      )}`}
                    >
                      Hang {pointInfo.tier}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary">{pointInfo.balance}</p>
                    <p className="text-sm text-gray-500">diem</p>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  Tong chi tieu: {formatCurrency(pointInfo.totalSpent)}
                </div>
              </div>
            )}

            {/* Rewards */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                Doi diem lay qua
              </h3>
              {rewards.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Chua co qua de doi</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {rewards.map((reward) => {
                    const canRedeem = pointInfo && pointInfo.balance >= reward.pointCost;
                    return (
                      <div
                        key={reward.id}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow p-4"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Gift className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {reward.name}
                            </h4>
                            <p className="text-sm text-primary font-medium">
                              {reward.pointCost} diem
                            </p>
                          </div>
                        </div>
                        {reward.description && (
                          <p className="text-sm text-gray-500 mb-3">{reward.description}</p>
                        )}
                        <button
                          onClick={() => handleRedeem(reward.id)}
                          disabled={!canRedeem || redeemingId === reward.id}
                          className={`w-full py-2 rounded-lg font-medium ${
                            canRedeem
                              ? "bg-primary text-white hover:bg-primary/90"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          {redeemingId === reward.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                          ) : canRedeem ? (
                            "Doi ngay"
                          ) : (
                            `Can them ${reward.pointCost - (pointInfo?.balance || 0)} diem`
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Point history */}
            {pointInfo && pointInfo.history.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                  Lich su diem
                </h3>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow divide-y divide-gray-100 dark:divide-gray-700">
                  {pointInfo.history.slice(0, 10).map((h) => (
                    <div key={h.id} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {h.description || h.source}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(h.createdAt).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                      <span
                        className={`font-medium ${
                          h.amount > 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {h.amount > 0 ? "+" : ""}
                        {h.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
