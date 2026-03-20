export interface VietQrConfig {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export const DEFAULT_VIETQR_CONFIG: VietQrConfig = {
  bankCode: 'VCB',
  bankName: 'Vietcombank',
  accountNumber: '0123456789',
  accountName: 'LINGERIE SHOP',
};

export function buildVietQrUrl(params: {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  addInfo: string;
  template?: string;
}) {
  const { bankCode, accountNumber, accountName, amount, addInfo, template = 'compact2' } = params;
  const query = new URLSearchParams();
  query.set('amount', String(Math.round(amount)));
  query.set('addInfo', addInfo);
  query.set('accountName', accountName);
  return `https://img.vietqr.io/image/${bankCode}-${accountNumber}-${template}.png?${query.toString()}`;
}
