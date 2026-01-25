const fs = require('fs');

const filePath = 'E:\\my-lingerie-shop\\frontend\\src\\components\\dashboard\\pages\\Staff.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
const newLines = [];
let i = 0;

while (i < lines.length) {
  // Find the api.patch line in handlePromoteRole
  if (lines[i].includes('await api.patch(`/admin/users/${promotionData.existingUser.id}/promote-role`')) {
    // Insert dynamic endpoint logic before api.patch
    newLines.push('');
    newLines.push('      // Dynamic endpoint based on isRestore flag');
    newLines.push('      const endpoint = promotionData.isRestore');
    newLines.push('        ? `/admin/users/${promotionData.existingUser.id}/restore`');
    newLines.push('        : `/admin/users/${promotionData.existingUser.id}/promote-role`;');
    newLines.push('');
    newLines.push('      await api.patch(endpoint, {');
    newLines.push('        ...(promotionData.isRestore');
    newLines.push('          ? { roleId: promotionData.requestedRoleId }  // restore endpoint');
    newLines.push('          : { newRoleId: promotionData.requestedRoleId })  // promote endpoint');
    // Skip next 2 lines (old api.patch call)
    i += 3;
    continue;
  }

  // Update success message
  if (lines[i].includes('? `Đã nâng cấp quyền thành công!')) {
    newLines.push('          ? `Đã ${promotionData.isRestore ? \'khôi phục\' : \'nâng cấp quyền\'} thành công! ${promotionData.existingUser.name} cần đăng nhập lại.`');
    i++;
    continue;
  }

  if (lines[i].includes(': `Role promoted successfully!')) {
    newLines.push('          : `${promotionData.isRestore ? \'Restored\' : \'Promoted\'} successfully! ${promotionData.existingUser.name} needs to login again.`');
    i++;
    continue;
  }

  newLines.push(lines[i]);
  i++;
}

fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');

console.log('✅ handlePromoteRole function updated!');
console.log('   - Added dynamic endpoint selection');
console.log('   - Updated to use roleId for restore, newRoleId for promote');
console.log('   - Updated success messages');
