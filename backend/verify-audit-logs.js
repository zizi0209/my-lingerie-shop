/**
 * Verify Audit Logs Script
 * Run: node verify-audit-logs.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function verifyAuditLogs() {
  log('\n╔════════════════════════════════════════════════╗', colors.cyan);
  log('║     AUDIT LOGS VERIFICATION                   ║', colors.cyan);
  log('╚════════════════════════════════════════════════╝', colors.cyan);

  try {
    // Get recent audit logs
    const recentLogs = await prisma.auditLog.findMany({
      take: 15,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    if (recentLogs.length === 0) {
      log('\n⚠️  No audit logs found!', colors.yellow);
      return;
    }

    log(`\n✅ Found ${recentLogs.length} recent audit logs:\n`, colors.green);

    // Group by action
    const groupedByAction = {};
    recentLogs.forEach(log => {
      if (!groupedByAction[log.action]) {
        groupedByAction[log.action] = [];
      }
      groupedByAction[log.action].push(log);
    });

    // Display summary
    log('📊 Audit Logs Summary:', colors.cyan);
    log('─'.repeat(80), colors.cyan);
    
    for (const [action, logs] of Object.entries(groupedByAction)) {
      const criticalCount = logs.filter(l => l.severity === 'CRITICAL').length;
      const warningCount = logs.filter(l => l.severity === 'WARNING').length;
      const infoCount = logs.filter(l => l.severity === 'INFO').length;

      let severityStr = '';
      if (criticalCount > 0) severityStr += `${colors.red}CRITICAL:${criticalCount}${colors.reset} `;
      if (warningCount > 0) severityStr += `${colors.yellow}WARNING:${warningCount}${colors.reset} `;
      if (infoCount > 0) severityStr += `${colors.green}INFO:${infoCount}${colors.reset}`;

      log(`  ${action}: ${logs.length} entries (${severityStr})`);
    }

    // Show detailed logs
    log('\n📝 Detailed Logs:', colors.cyan);
    log('─'.repeat(80), colors.cyan);

    recentLogs.forEach((log, index) => {
      const severityColor = 
        log.severity === 'CRITICAL' ? colors.red :
        log.severity === 'WARNING' ? colors.yellow :
        colors.green;

      console.log(`\n${index + 1}. [${severityColor}${log.severity}${colors.reset}] ${log.action}`);
      console.log(`   User: ${log.user.email} (ID: ${log.userId})`);
      console.log(`   Resource: ${log.resource}${log.resourceId ? ` (ID: ${log.resourceId})` : ''}`);
      console.log(`   Time: ${log.createdAt.toLocaleString()}`);
      
      if (log.ipAddress) {
        console.log(`   IP: ${log.ipAddress}`);
      }

      if (log.oldValue || log.newValue) {
        if (log.oldValue) {
          console.log(`   Old: ${JSON.stringify(log.oldValue).substring(0, 100)}...`);
        }
        if (log.newValue) {
          console.log(`   New: ${JSON.stringify(log.newValue).substring(0, 100)}...`);
        }
      }
    });

    // Statistics
    log('\n📈 Statistics:', colors.cyan);
    log('─'.repeat(80), colors.cyan);

    const totalLogs = await prisma.auditLog.count();
    const criticalLogs = await prisma.auditLog.count({ where: { severity: 'CRITICAL' } });
    const warningLogs = await prisma.auditLog.count({ where: { severity: 'WARNING' } });
    const infoLogs = await prisma.auditLog.count({ where: { severity: 'INFO' } });

    log(`Total Audit Logs: ${totalLogs}`);
    log(`├─ CRITICAL: ${criticalLogs}`, colors.red);
    log(`├─ WARNING: ${warningLogs}`, colors.yellow);
    log(`└─ INFO: ${infoLogs}`, colors.green);

    // Actions count
    const actionsCount = await prisma.auditLog.groupBy({
      by: ['action'],
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } }
    });

    log('\n🔍 Most Common Actions:', colors.cyan);
    actionsCount.slice(0, 5).forEach(item => {
      log(`  ${item.action}: ${item._count.action} times`);
    });

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, colors.red);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyLockedUsers() {
  log('\n╔════════════════════════════════════════════════╗', colors.cyan);
  log('║     LOCKED USERS VERIFICATION                 ║', colors.cyan);
  log('╚════════════════════════════════════════════════╝', colors.cyan);

  try {
    const lockedUsers = await prisma.user.findMany({
      where: {
        OR: [
          { failedLoginAttempts: { gt: 0 } },
          { lockedUntil: { not: null } }
        ]
      },
      select: {
        id: true,
        email: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        lastLoginAt: true
      }
    });

    if (lockedUsers.length === 0) {
      log('\n✅ No users with failed login attempts or locks', colors.green);
      return;
    }

    log(`\n⚠️  Found ${lockedUsers.length} users with security events:\n`, colors.yellow);

    lockedUsers.forEach((user, index) => {
      const isLocked = user.lockedUntil && user.lockedUntil > new Date();
      const lockColor = isLocked ? colors.red : colors.yellow;

      console.log(`${index + 1}. ${lockColor}${user.email}${colors.reset}`);
      console.log(`   Failed Attempts: ${user.failedLoginAttempts}`);
      
      if (user.lockedUntil) {
        const isStillLocked = user.lockedUntil > new Date();
        const lockStatus = isStillLocked ? '🔒 LOCKED' : '🔓 Unlocked (expired)';
        console.log(`   Lock Status: ${lockStatus}`);
        console.log(`   Lock Until: ${user.lockedUntil.toLocaleString()}`);
        
        if (isStillLocked) {
          const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
          console.log(`   Time Remaining: ${minutesLeft} minutes`);
        }
      }
      
      if (user.lastLoginAt) {
        console.log(`   Last Login: ${user.lastLoginAt.toLocaleString()}`);
      }
      console.log('');
    });

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, colors.red);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyTestUsers() {
  log('\n╔════════════════════════════════════════════════╗', colors.cyan);
  log('║     TEST USERS VERIFICATION                   ║', colors.cyan);
  log('╚════════════════════════════════════════════════╝', colors.cyan);

  try {
    const testUsers = await prisma.user.findMany({
      where: {
        email: {
          contains: 'test.com'
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        roleId: true,
        role: {
          select: {
            name: true
          }
        },
        failedLoginAttempts: true,
        lockedUntil: true,
        passwordChangedAt: true,
        tokenVersion: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    if (testUsers.length === 0) {
      log('\n⚠️  No test users found', colors.yellow);
      return;
    }

    log(`\n✅ Found ${testUsers.length} recent test users:\n`, colors.green);

    testUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Role: ${user.role?.name || 'None'} ${user.roleId === null ? '✅' : '❌'}`);
      console.log(`   Token Version: ${user.tokenVersion}`);
      console.log(`   Failed Attempts: ${user.failedLoginAttempts}`);
      console.log(`   Password Changed: ${user.passwordChangedAt?.toLocaleString() || 'Never'}`);
      console.log(`   Created: ${user.createdAt.toLocaleString()}`);
      console.log('');
    });

    // Verify mass assignment prevention
    const usersWithRole = testUsers.filter(u => u.roleId !== null);
    if (usersWithRole.length === 0) {
      log('✅ Mass Assignment Prevention: All test users have roleId = null', colors.green);
    } else {
      log(`❌ Mass Assignment Prevention: ${usersWithRole.length} test users have roleId set!`, colors.red);
      usersWithRole.forEach(u => {
        log(`   - ${u.email}: roleId = ${u.roleId}`, colors.red);
      });
    }

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, colors.red);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

async function runAllVerifications() {
  await verifyAuditLogs();
  await verifyLockedUsers();
  await verifyTestUsers();

  log('\n╔════════════════════════════════════════════════╗', colors.cyan);
  log('║     VERIFICATION COMPLETE                     ║', colors.cyan);
  log('╚════════════════════════════════════════════════╝\n', colors.cyan);
}

runAllVerifications();
