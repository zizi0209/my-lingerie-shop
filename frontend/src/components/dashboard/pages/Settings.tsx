
import React from 'react';
import { Save, Globe, Mail, Bell, Shield } from 'lucide-react';

const Settings: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">General Settings</h1>
        <p className="text-slate-500">Update your store profile and configuration.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          <section>
            <div className="flex items-center space-x-2 mb-6 text-rose-600">
              <Globe size={20} />
              <h3 className="font-bold text-lg">Store Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Store Name</label>
                <input type="text" defaultValue="Silk & Lace Boutique" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Support Email</label>
                <input type="email" defaultValue="support@silklace.com" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">Store Description</label>
                <textarea rows={3} defaultValue="Premium luxury lingerie for the modern woman." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20" />
              </div>
            </div>
          </section>

          <section className="pt-8 border-t border-slate-100">
            <div className="flex items-center space-x-2 mb-6 text-rose-600">
              <Bell size={20} />
              <h3 className="font-bold text-lg">Notifications</h3>
            </div>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-900">Order Alerts</p>
                  <p className="text-sm text-slate-500">Get notified whenever someone places an order</p>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5 accent-rose-500" />
              </label>
              <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-900">Low Stock Alerts</p>
                  <p className="text-sm text-slate-500">Notify when product inventory drops below 10</p>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5 accent-rose-500" />
              </label>
            </div>
          </section>

          <div className="flex justify-end pt-4">
            <button className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-3 rounded-xl font-bold flex items-center space-x-2 transition-all shadow-lg shadow-rose-200">
              <Save size={20} />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
