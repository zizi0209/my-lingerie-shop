
import React from 'react';
import { Save, Globe, Bell } from 'lucide-react';
import { useLanguage } from '../components/LanguageContext';

const Settings: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">{t('settings.title')}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('settings.desc')}</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white dark:bg-slate-900/50 p-6 md:p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm space-y-10">
          <section>
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
                <Globe size={20} />
              </div>
              <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tighter">{t('settings.storeInfo')}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('settings.storeName')}</label>
                <input 
                  type="text" 
                  defaultValue="Silk & Lace Boutique" 
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 dark:text-slate-200 transition-all font-bold" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('settings.supportEmail')}</label>
                <input 
                  type="email" 
                  defaultValue="support@silklace.com" 
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 dark:text-slate-200 transition-all font-bold" 
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('settings.storeDesc')}</label>
                <textarea 
                  rows={3} 
                  defaultValue="Premium luxury lingerie for the modern woman. Curated with silk and love." 
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 dark:text-slate-200 transition-all font-bold resize-none" 
                />
              </div>
            </div>
          </section>

          <section className="pt-10 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                <Bell size={20} />
              </div>
              <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tighter">{t('settings.notifications')}</h3>
            </div>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                <div className="flex-1">
                  <p className="font-bold text-slate-900 dark:text-slate-200 text-sm">{t('settings.orderAlerts')}</p>
                </div>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-rose-500"></div>
                </div>
              </label>
              <label className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                <div className="flex-1">
                  <p className="font-bold text-slate-900 dark:text-slate-200 text-sm">{t('settings.stockWarnings')}</p>
                </div>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-rose-500"></div>
                </div>
              </label>
            </div>
          </section>

          <div className="flex justify-end pt-6">
            <button className="bg-rose-500 hover:bg-rose-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center space-x-3 transition-all shadow-xl shadow-rose-200 dark:shadow-none active:scale-95">
              <Save size={18} />
              <span>{t('common.save')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
