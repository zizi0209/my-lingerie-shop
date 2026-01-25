const fs = require('fs');

const filePath = 'E:\\my-lingerie-shop\\frontend\\src\\components\\dashboard\\pages\\Staff.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Update modal title to show Restore or Promote
content = content.replace(
  `<h2 className="text-xl font-bold text-slate-900 dark:text-white">
                🔄 {language === 'vi' ? 'Nâng cấp quyền tài khoản' : 'Promote Account Role'}
              </h2>`,
  `<h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {promotionData.isRestore ? '♻️' : '🔄'} {language === 'vi'
                  ? (promotionData.isRestore ? 'Khôi phục tài khoản' : 'Nâng cấp quyền tài khoản')
                  : (promotionData.isRestore ? 'Restore Account' : 'Promote Account Role')}
              </h2>`
);

// Update info panel message
content = content.replace(
  `Tài khoản <strong>{promotionData.existingUser.name || promotionData.existingUser.email}</strong> đã tồn tại trong hệ thống với vai trò <strong className="px-2 py-0.5 bg-blue-200 dark:bg-blue-800 rounded">{promotionData.existingUser.currentRole}</strong>.`,
  `Tài khoản <strong>{promotionData.existingUser.name || promotionData.existingUser.email}</strong> {promotionData.isRestore ? 'đã bị xóa' : 'đã tồn tại trong hệ thống'} với vai trò <strong className="px-2 py-0.5 bg-blue-200 dark:bg-blue-800 rounded">{promotionData.existingUser.currentRole}</strong>.`
);

content = content.replace(
  `Account <strong>{promotionData.existingUser.name || promotionData.existingUser.email}</strong> already exists with role <strong className="px-2 py-0.5 bg-blue-200 dark:bg-blue-800 rounded">{promotionData.existingUser.currentRole}</strong>.`,
  `Account <strong>{promotionData.existingUser.name || promotionData.existingUser.email}</strong> {promotionData.isRestore ? 'was deleted' : 'already exists'} with role <strong className="px-2 py-0.5 bg-blue-200 dark:bg-blue-800 rounded">{promotionData.existingUser.currentRole}</strong>.`
);

// Update action question
content = content.replace(
  `Bạn có muốn nâng cấp lên <strong className="px-2 py-0.5 bg-emerald-200 dark:bg-emerald-800 rounded">{promotionData.requestedRole}</strong> không?`,
  `Bạn có muốn {promotionData.isRestore ? 'khôi phục và đặt vai trò' : 'nâng cấp lên'} <strong className="px-2 py-0.5 bg-emerald-200 dark:bg-emerald-800 rounded">{promotionData.requestedRole}</strong> không?`
);

content = content.replace(
  `Do you want to promote to <strong className="px-2 py-0.5 bg-emerald-200 dark:bg-emerald-800 rounded">{promotionData.requestedRole}</strong>?`,
  `Do you want to {promotionData.isRestore ? 'restore and set role to' : 'promote to'} <strong className="px-2 py-0.5 bg-emerald-200 dark:bg-emerald-800 rounded">{promotionData.requestedRole}</strong>?`
);

// Update button text
content = content.replace(
  `{language === 'vi' ? 'Xác nhận nâng cấp' : 'Confirm Promotion'}`,
  `{language === 'vi'
    ? (promotionData.isRestore ? 'Xác nhận khôi phục' : 'Xác nhận nâng cấp')
    : (promotionData.isRestore ? 'Confirm Restore' : 'Confirm Promotion')}`
);

fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Staff.tsx modal UI updated successfully!');
console.log('   - Modal title shows "Restore" or "Promote"');
console.log('   - Info panel shows "deleted" or "exists"');
console.log('   - Action question adapted for restore');
console.log('   - Button text shows "Restore" or "Promote"');
