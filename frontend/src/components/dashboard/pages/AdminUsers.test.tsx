import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUsers from './AdminUsers';
import * as adminApi from '@/lib/adminApi';

// Mock adminApi
vi.mock('@/lib/adminApi');

const mockUsers = [
  {
    id: 1,
    email: 'user1@example.com',
    name: 'User One',
    phone: null,
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    role: { id: 1, name: 'USER' },
  },
  {
    id: 2,
    email: 'admin@example.com',
    name: 'Admin User',
    phone: null,
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    role: { id: 2, name: 'ADMIN' },
  },
];

describe('AdminUsers Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock API calls
    vi.mocked(adminApi.adminUserApi.list).mockResolvedValue({
      success: true,
      data: mockUsers,
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        pages: 1,
      },
    });
  });

  it('should render users list', async () => {
    render(<AdminUsers />);

    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    });
  });

  it('should display loading state initially', () => {
    render(<AdminUsers />);
    
    // Should show loading skeleton
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should filter by role', async () => {
    const user = userEvent.setup();
    render(<AdminUsers />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });

    // Find and click role filter
    const roleSelects = document.querySelectorAll('select');
    const roleSelect = Array.from(roleSelects).find(
      (select) => select.options[0].text === 'Tất cả roles'
    );
    
    if (roleSelect) {
      await user.selectOptions(roleSelect, 'ADMIN');

      // Verify API called with filter
      expect(adminApi.adminUserApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'ADMIN' })
      );
    }
  });

  it('should open role change modal', async () => {
    const user = userEvent.setup();
    render(<AdminUsers />);

    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });

    // Click "Đổi role" button
    const changeRoleButtons = screen.getAllByText('Đổi role');
    await user.click(changeRoleButtons[0]);

    // Modal should appear
    expect(screen.getByText('Thay đổi Role')).toBeInTheDocument();
  });

  it('should toggle user status', async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.adminUserApi.updateStatus).mockResolvedValue({
      success: true,
      data: { ...mockUsers[0], isActive: false },
      message: 'Success',
    });

    // Mock window.alert
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<AdminUsers />);

    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });

    // Click "Vô hiệu hóa"
    const deactivateButtons = screen.getAllByText('Vô hiệu hóa');
    await user.click(deactivateButtons[0]);

    // Verify API called
    expect(adminApi.adminUserApi.updateStatus).toHaveBeenCalledWith(1, false);
    
    alertMock.mockRestore();
  });
});
