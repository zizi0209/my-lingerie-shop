// Script kiểm tra doanh thu trong database
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRevenue() {
  console.log('🔍 Kiểm tra doanh thu trong database...\n');

  try {
    // 1. Tổng số đơn hàng
    const totalOrders = await prisma.order.count();
    console.log(`📦 Tổng số đơn hàng: ${totalOrders}`);

    // 2. Đơn hàng theo status
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: { status: true },
      _sum: { totalAmount: true }
    });

    console.log('\n📊 Đơn hàng theo trạng thái:');
    ordersByStatus.forEach(item => {
      const total = item._sum.totalAmount || 0;
      const formatted = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
      }).format(total);
      console.log(`  ${item.status}: ${item._count.status} đơn - ${formatted}`);
    });

    // 3. Doanh thu DELIVERED (như trong API)
    const deliveredRevenue = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      _count: true,
      where: { status: 'DELIVERED' }
    });

    const deliveredTotal = deliveredRevenue._sum.totalAmount || 0;
    const deliveredFormatted = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(deliveredTotal);

    console.log(`\n💰 Doanh thu DELIVERED (hiển thị trên dashboard):`);
    console.log(`  Số đơn: ${deliveredRevenue._count}`);
    console.log(`  Tổng tiền: ${deliveredFormatted}`);
    console.log(`  Raw value: ${deliveredTotal}`);

    // 4. Format như frontend
    const formatShortCurrency = (amount: number): string => {
      if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`;
      if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
      if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
      return amount.toString();
    };

    console.log(`  Frontend hiển thị: ${formatShortCurrency(deliveredTotal)}`);

    // 5. Kiểm tra 10 đơn hàng DELIVERED gần nhất
    const recentDelivered = await prisma.order.findMany({
      where: { status: 'DELIVERED' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        createdAt: true,
        user: { select: { email: true } }
      }
    });

    if (recentDelivered.length > 0) {
      console.log(`\n📋 10 đơn DELIVERED gần nhất:`);
      recentDelivered.forEach(order => {
        const formatted = new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND'
        }).format(order.totalAmount);
        console.log(`  #${order.orderNumber}: ${formatted} - ${order.user?.email || 'N/A'}`);
      });
    } else {
      console.log(`\n⚠️  KHÔNG CÓ đơn hàng DELIVERED nào!`);
    }

    // 6. Tổng doanh thu ALL status (để so sánh)
    const allRevenue = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      _count: true
    });

    const allTotal = allRevenue._sum.totalAmount || 0;
    const allFormatted = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(allTotal);

    console.log(`\n💵 Tổng doanh thu TẤT CẢ trạng thái:`);
    console.log(`  Số đơn: ${allRevenue._count}`);
    console.log(`  Tổng tiền: ${allFormatted}`);
    console.log(`  Frontend hiển thị: ${formatShortCurrency(allTotal)}`);

    // 7. Phân tích vấn đề
    console.log(`\n🔍 PHÂN TÍCH:`);
    if (deliveredTotal === 0) {
      console.log(`  ❌ Vấn đề: Không có đơn hàng DELIVERED nào!`);
      console.log(`  💡 Giải pháp: Cần update status đơn hàng hoặc thay đổi logic tính doanh thu`);
    } else if (deliveredTotal === allTotal) {
      console.log(`  ✅ Tất cả đơn hàng đều DELIVERED`);
    } else {
      const diff = allTotal - deliveredTotal;
      const diffFormatted = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
      }).format(diff);
      console.log(`  ⚠️  Có ${diffFormatted} từ đơn hàng chưa DELIVERED`);
    }

    if (formatShortCurrency(deliveredTotal) === '2.0M') {
      console.log(`  ✅ Xác nhận: Dashboard hiển thị đúng 2.0M`);
      console.log(`  📌 Đây là số liệu THẬT từ database, không phải bug!`);
    }

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRevenue();
