import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu seed database...');

  // Seed Permissions
  const permissions = [
    { name: 'user.read', description: 'Xem danh sách người dùng' },
    { name: 'user.create', description: 'Tạo người dùng mới' },
    { name: 'user.update', description: 'Cập nhật người dùng' },
    { name: 'user.delete', description: 'Xóa người dùng' },
    
    { name: 'role.read', description: 'Xem danh sách vai trò' },
    { name: 'role.create', description: 'Tạo vai trò mới' },
    { name: 'role.update', description: 'Cập nhật vai trò' },
    { name: 'role.delete', description: 'Xóa vai trò' },
    
    { name: 'product.read', description: 'Xem danh sách sản phẩm' },
    { name: 'product.create', description: 'Tạo sản phẩm mới' },
    { name: 'product.update', description: 'Cập nhật sản phẩm' },
    { name: 'product.delete', description: 'Xóa sản phẩm' },
    
    { name: 'category.read', description: 'Xem danh sách danh mục' },
    { name: 'category.create', description: 'Tạo danh mục mới' },
    { name: 'category.update', description: 'Cập nhật danh mục' },
    { name: 'category.delete', description: 'Xóa danh mục' },
    
    { name: 'order.read', description: 'Xem danh sách đơn hàng' },
    { name: 'order.create', description: 'Tạo đơn hàng mới' },
    { name: 'order.update', description: 'Cập nhật đơn hàng' },
    { name: 'order.delete', description: 'Xóa đơn hàng' },
    
    { name: 'post.read', description: 'Xem danh sách bài viết' },
    { name: 'post.create', description: 'Tạo bài viết mới' },
    { name: 'post.update', description: 'Cập nhật bài viết' },
    { name: 'post.delete', description: 'Xóa bài viết' },
    
    { name: 'page-section.read', description: 'Xem cấu hình trang' },
    { name: 'page-section.update', description: 'Cập nhật cấu hình trang' },
    
    { name: 'media.read', description: 'Xem thư viện media' },
    { name: 'media.upload', description: 'Upload media' },
    { name: 'media.delete', description: 'Xóa media' },
    
    { name: 'system.config', description: 'Cấu hình hệ thống' },
  ];

  console.log('📝 Tạo permissions...');
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }
  console.log(`✅ Đã tạo ${permissions.length} permissions`);

  // Seed Roles
  console.log('📝 Tạo roles...');
  
  const allPermissions = await prisma.permission.findMany();
  
  // Admin role - có tất cả quyền
  await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: {
      name: 'Admin',
      description: 'Quản trị viên - có toàn quyền',
      permissions: {
        connect: allPermissions.map(p => ({ id: p.id })),
      },
    },
  });
  console.log('✅ Đã tạo role Admin');

  // Manager role - quản lý sản phẩm, đơn hàng
  const managerPermissions = allPermissions.filter(p => 
    p.name.startsWith('product.') || 
    p.name.startsWith('category.') || 
    p.name.startsWith('order.') ||
    p.name.startsWith('media.')
  );
  
  await prisma.role.upsert({
    where: { name: 'Manager' },
    update: {},
    create: {
      name: 'Manager',
      description: 'Quản lý - quản lý sản phẩm và đơn hàng',
      permissions: {
        connect: managerPermissions.map(p => ({ id: p.id })),
      },
    },
  });
  console.log('✅ Đã tạo role Manager');

  // Editor role - chỉ chỉnh sửa nội dung
  const editorPermissions = allPermissions.filter(p => 
    p.name.startsWith('post.') || 
    p.name.startsWith('page-section.') ||
    p.name.startsWith('media.')
  );
  
  await prisma.role.upsert({
    where: { name: 'Editor' },
    update: {},
    create: {
      name: 'Editor',
      description: 'Biên tập viên - quản lý nội dung',
      permissions: {
        connect: editorPermissions.map(p => ({ id: p.id })),
      },
    },
  });
  console.log('✅ Đã tạo role Editor');

  // Customer role - khách hàng
  await prisma.role.upsert({
    where: { name: 'Customer' },
    update: {},
    create: {
      name: 'Customer',
      description: 'Khách hàng',
      permissions: {
        connect: [],
      },
    },
  });
  console.log('✅ Đã tạo role Customer');

  console.log('🎉 Seed database hoàn tất!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
