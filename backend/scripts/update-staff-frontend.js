const fs = require('fs');
const path = require('path');

const filePath = 'E:\\my-lingerie-shop\\frontend\\src\\components\\dashboard\\pages\\Staff.tsx';

let content = fs.readFileSync(filePath, 'utf8');

// Replace the handlePromoteRole function
const oldFunction = `await api.patch(\`/admin/users/\${promotionData.existingUser.id}/promote-role\`, {
        newRoleId: promotionData.requestedRoleId
      });

      setSuccessMessage(
        language === 'vi'
          ? \`Đã nâng cấp quyền thành công! \${promotionData.existingUser.name} cần đăng nhập lại.\`
          : \`Role promoted successfully! \${promotionData.existingUser.name} needs to login again.\`
      );`;

const newFunction = `// Dynamic endpoint based on isRestore flag
      const endpoint = promotionData.isRestore
        ? \`/admin/users/\${promotionData.existingUser.id}/restore\`
        : \`/admin/users/\${promotionData.existingUser.id}/promote-role\`;

      await api.patch(endpoint, {
        ...(promotionData.isRestore
          ? { roleId: promotionData.requestedRoleId }  // restore endpoint
          : { newRoleId: promotionData.requestedRoleId })  // promote endpoint
      });

      setSuccessMessage(
        language === 'vi'
          ? \`Đã \${promotionData.isRestore ? 'khôi phục' : 'nâng cấp quyền'} thành công! \${promotionData.existingUser.name} cần đăng nhập lại.\`
          : \`\${promotionData.isRestore ? 'Restored' : 'Promoted'} successfully! \${promotionData.existingUser.name} needs to login again.\`
      );`;

content = content.replace(oldFunction, newFunction);

// Update function comment
content = content.replace(
  '// Handle Role Promotion (Enterprise: Single Identity Principle)',
  '// Handle Role Promotion & Restore (Enterprise: Single Identity Principle)'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Staff.tsx updated successfully!');
console.log('   - Added isRestore flag support');
console.log('   - Updated handlePromoteRole to use dynamic endpoint');
console.log('   - Updated success messages for restore vs promote');
