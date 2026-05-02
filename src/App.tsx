/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { 
  Send, 
  UserPlus, 
  Trash2, 
  CheckCircle2, 
  ExternalLink, 
  Package, 
  Phone, 
  User,
  Plus,
  Moon,
  Sun,
  LayoutGrid,
  List as ListIcon,
  Search,
  MessageSquare,
  AlertCircle,
  Settings,
  Database,
  RefreshCw,
  X,
  FileSpreadsheet,
  Info,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Contact, AppSettings } from './types';
import { GOOGLE_SHEET_SCRIPT_URL } from './constants';
import ScannerModal from './components/ScannerModal';

export default function App() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    autoSync: true
  });

  // Lookup logic: Autofill name and address if phone exists
  useEffect(() => {
    const cleanPhone = newPhone.replace(/\D/g, '');
    if (cleanPhone.length >= 4) {
      const formatted = cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone;
      const existing = contacts.find(c => 
        c.phone === formatted || 
        c.phone === cleanPhone || 
        (c.phone.length > 5 && c.phone.endsWith(cleanPhone.slice(-5)))
      );
      
      if (existing) {
        setNewName(existing.name);
        setNewAddress(existing.address || '');
        // Otomatis arahkan pencarian ke nomor ini agar muncul di daftar kanan
        setSearchTerm(existing.phone);
      }
    }
  }, [newPhone, contacts]);

  // Load from local storage
  useEffect(() => {
    const savedContacts = localStorage.getItem('jt_contacts');
    const savedSettings = localStorage.getItem('jt_settings');
    if (savedContacts) setContacts(JSON.parse(savedContacts));
    if (savedSettings) setSettings(JSON.parse(savedSettings));
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('jt_contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('jt_settings', JSON.stringify(settings));
  }, [settings]);

  const addContact = (e: FormEvent) => {
    e.preventDefault();
    if (!newPhone) return;

    const formattedPhone = newPhone.startsWith('0') 
      ? '62' + newPhone.substring(1) 
      : newPhone.startsWith('62') ? newPhone : '62' + newPhone;

    // Check if updating existing or adding new (Database style)
    const existingIndex = contacts.findIndex(c => c.phone === formattedPhone);
    
    const contactData: Contact = {
      id: existingIndex >= 0 ? contacts[existingIndex].id : crypto.randomUUID(),
      name: newName || 'Tanpa Nama',
      phone: formattedPhone,
      address: newAddress,
      resi: '',
      status: 'pending',
      timestamp: new Date().toLocaleString('id-ID')
    };

    if (existingIndex >= 0) {
      const updatedContacts = [...contacts];
      // Keep existing resi if we are just updating info
      updatedContacts[existingIndex] = { 
        ...updatedContacts[existingIndex], 
        ...contactData, 
        resi: updatedContacts[existingIndex].resi 
      }; 
      setContacts(updatedContacts);
    } else {
      setContacts([contactData, ...contacts]);
    }

    setNewName('');
    setNewPhone('');
    setNewAddress('');
    
    if (settings.autoSync) {
      syncToGoogleSheet([contactData]);
    }
  };

  const syncToGoogleSheet = async (dataToSync: Contact[]) => {
    if (!GOOGLE_SHEET_SCRIPT_URL || GOOGLE_SHEET_SCRIPT_URL.includes('YOUR_SCRIPT_ID')) {
      alert('Silahkan atur URL Google Script di file src/constants.ts terlebih dahulu.');
      return;
    }

    setIsSyncing(true);
    try {
      await fetch(GOOGLE_SHEET_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(dataToSync.map(c => ({
          name: c.name,
          phone: c.phone,
          address: c.address,
          resi: c.resi,
          status: c.status,
          timestamp: c.timestamp || new Date().toLocaleString('id-ID')
        })))
      });
      alert('Data berhasil disimpan ke Cloud!');
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Gagal sinkronisasi. Cek koneksi Anda.');
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchFromCloud = async () => {
    if (!GOOGLE_SHEET_SCRIPT_URL || GOOGLE_SHEET_SCRIPT_URL.includes('YOUR_SCRIPT_ID')) return;
    
    setIsSyncing(true);
    try {
      const response = await fetch(GOOGLE_SHEET_SCRIPT_URL);
      const cloudData = await response.json();
      
      if (Array.isArray(cloudData)) {
        // Gabungkan data cloud dengan local, prioritaskan data terbaru
        const formattedCloud = cloudData.map((c: any) => ({
          id: crypto.randomUUID(),
          name: String(c.name || '').trim(),
          phone: String(c.phone || '').replace(/'/g, '').trim(),
          address: String(c.address || '').trim(),
          resi: String(c.resi || '').trim(),
          status: (c.status as 'pending' | 'sent') || 'pending',
          timestamp: c.timestamp
        }));

        setContacts(prev => {
          const combined = [...prev];
          formattedCloud.forEach(cloudItem => {
            const index = combined.findIndex(p => p.phone === cloudItem.phone);
            if (index === -1) {
              combined.push(cloudItem);
            } else {
              // Update jika perlu
              combined[index] = { ...combined[index], ...cloudItem };
            }
          });
          return [...combined];
        });
      }
    } catch (error) {
      console.error('Fetch failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchFromCloud();
  }, []);

  const updateResi = (id: string, resi: string) => {
    setActiveScanId(id); // Set as active to prevent vanishing while typing
    setContacts(contacts.map(c => c.id === id ? { ...c, resi } : c));
  };

  const handleScanSuccess = (resi: string) => {
    if (activeScanId) {
      updateResi(activeScanId, resi);
      setActiveScanId(null);
    }
  };

  const openScanner = (id: string) => {
    setActiveScanId(id);
    setIsScannerOpen(true);
  };

  const removeContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  const markAsSent = (id: string) => {
    setContacts(contacts.map(c => c.id === id ? { ...c, status: 'sent' } : c));
  };

  const generateMessage = (resi: string) => {
    return encodeURIComponent(`Hallo Kami Dari J&T Lalan Grai Aini Paket Anda Telah Sampai dengan nomer resi *${resi}* Lakukan konfirmasi paket anda`);
  };

  const openWhatsApp = (contact: Contact) => {
    if (!contact.resi) {
      alert('Silahkan masukkan nomor resi terlebih dahulu.');
      return;
    }
    const message = generateMessage(contact.resi);
    const url = `https://wa.me/${contact.phone}?text=${message}`;
    
    // Status lokal & buka WA
    window.open(url, '_blank');
    
    // Bersihkan resi untuk kontak ini dan tandai terkirim
    setContacts(contacts.map(c => c.id === contact.id ? { ...c, resi: '', status: 'sent' } : c));
    
    // Reset pencarian agar kontak "hilang" dari daftar aktif
    setSearchTerm('');
    setActiveScanId(null);
    setNewPhone('');
    setNewName('');
    setNewAddress('');

    // Otomatis sinkron ke Cloud (background) jika URL tersedia
    if (GOOGLE_SHEET_SCRIPT_URL) {
      const dataToSync = {
        ...contact,
        status: 'sent',
        timestamp: new Date().toLocaleString('id-ID')
      };
      
      fetch(GOOGLE_SHEET_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(dataToSync)
      }).catch(err => console.error("Auto-sync failed", err));
    }
  };

  const filteredContacts = searchTerm.trim() === '' 
    ? contacts.filter(c => c.id === activeScanId) 
    : contacts.filter(c => 
        c.id === activeScanId ||
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.phone.includes(searchTerm) ||
        c.resi.includes(searchTerm) ||
        (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()))
      );

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-slate-50'}`}>
      {/* Header */}
      <header className="jt-gradient text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl shadow-inner">
              <Package className="text-jt-red w-8 h-8" />
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight">J&T LALAN</h1>
              <p className="text-xs opacity-90 font-medium">Broadcast Manager • Grai Aini</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              title="Pengaturan"
            >
              <Settings size={20} />
            </button>
            <div className="h-8 w-[1px] bg-white/20 mx-2" />
            <div className="hidden sm:flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-sm font-medium">
              <CheckCircle2 size={16} />
              <span>{contacts.filter(c => c.status === 'sent').length} Terkirim</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 relative">
        {/* Sync Status Banner */}
        <AnimatePresence>
          {isSyncing && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="bg-blue-500 text-white p-3 rounded-2xl flex items-center justify-center gap-3">
                <RefreshCw size={18} className="animate-spin" />
                <span className="font-bold text-sm">Sedang sinkronisasi ke Google Sheets...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="grid lg:grid-cols-[380px_1fr] gap-8">
          
          {/* Left Column: Form */}
          <aside className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-6 rounded-3xl shadow-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-jt-light flex items-center justify-center">
                  <UserPlus className="text-jt-red" size={20} />
                </div>
                <h2 className="text-xl font-bold font-display">Data Pelanggan</h2>
              </div>
              
              <form onSubmit={addContact} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 opacity-70">Nomor WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="tel" 
                      value={newPhone}
                      required
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="0812..."
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:ring-2 focus:ring-jt-red/20 focus:border-jt-red outline-none transition-all ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                  {contacts.some(c => c.phone === (newPhone.startsWith('0') ? '62'+newPhone.substring(1) : newPhone)) && (
                    <p className="text-[10px] text-emerald-500 font-bold mt-1 flex items-center gap-1">
                      <CheckCircle2 size={10} /> Data ditemukan (Auto-update)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5 opacity-70">Nama</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nama Pelanggan"
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:ring-2 focus:ring-jt-red/20 focus:border-jt-red outline-none transition-all ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5 opacity-70">Alamat Lengkap</label>
                  <textarea 
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="Dusun II, Desa Lalan..."
                    rows={2}
                    className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-jt-red/20 focus:border-jt-red outline-none transition-all resize-none ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full jt-gradient text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-jt-red/30 transition-all active:scale-[0.98]"
                >
                  <Database size={20} />
                  Simpan ke Database
                </button>
              </form>
            </motion.div>

            {/* Google Sheets Sync Box */}
            <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Database size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold leading-none">Google Sheet</h3>
                    <p className="text-[10px] opacity-50 mt-1 uppercase font-bold">Cloud Storage</p>
                  </div>
                </div>
                <button 
                  onClick={fetchFromCloud}
                  disabled={isSyncing}
                  className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  title="Tarik data dari Cloud"
                >
                  <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
                </button>
                <button 
                  onClick={() => syncToGoogleSheet(contacts)}
                  disabled={isSyncing || contacts.length === 0}
                  className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  title="Simpan semua ke Cloud"
                >
                  <Send size={20} />
                </button>
              </div>
              <p className="text-xs opacity-60 mb-4 leading-relaxed">
                Tekan tombol sinkron untuk mengirimkan seluruh daftar kontak ke Google Sheet.
              </p>
              <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 p-2 rounded-lg">
                <Info size={12} />
                <span>URL Cloud Terpasang</span>
              </div>
            </div>

            {/* Quick Stats or Tips */}
            <div className={`p-5 rounded-3xl border border-dashed text-sm ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-jt-light/30 border-jt-red/20'}`}>
              <h3 className="font-bold flex items-center gap-2 text-jt-red mb-2">
                <MessageSquare size={16} /> Template Pesan
              </h3>
              <p className="opacity-70 italic leading-relaxed">
                "hallo kami dari jnt lalan grai aini paket ada telah samapi dengan nomer resi adalah <span className="font-bold text-jt-red">[NOMER RESI]</span>"
              </p>
            </div>
          </aside>

          {/* Right Column: List */}
          <section className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari nama, nomor, atau resi..."
                  className={`w-full pl-10 pr-10 py-2.5 rounded-2xl border outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 focus:border-jt-red'}`}
                />
                {searchTerm && (
                  <button 
                    onClick={() => {
                      setSearchTerm('');
                      setActiveScanId(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-jt-red transition-all"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-2xl dark:bg-slate-800">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-jt-red dark:bg-slate-700' : 'text-slate-500'}`}
                >
                  <ListIcon size={20} />
                </button>
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-jt-red dark:bg-slate-700' : 'text-slate-500'}`}
                >
                  <LayoutGrid size={20} />
                </button>
              </div>
            </div>

            {/* List/Grid Container */}
            <AnimatePresence mode="popLayout">
              {filteredContacts.length > 0 ? (
                <div className={viewMode === 'list' ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
                  {filteredContacts.map((contact, idx) => (
                    <motion.div
                      layout
                      key={contact.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`group relative overflow-hidden rounded-3xl border transition-all hover:shadow-xl ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} ${contact.status === 'sent' ? 'opacity-80' : ''}`}
                    >
                      {/* Sent Indicator Line */}
                      {contact.status === 'sent' && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                      )}

                      <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-5">
                        {/* Info */}
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg">{contact.name}</h3>
                            {contact.status === 'sent' && (
                              <span className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider dark:bg-emerald-900/30 dark:text-emerald-400">
                                <CheckCircle2 size={10} /> Terkirim
                              </span>
                            )}
                          </div>
                          <p className="text-sm opacity-60 flex items-center gap-1.5">
                            <Phone size={14} className="text-jt-red" /> {contact.phone}
                          </p>
                          {contact.address && (
                            <p className="text-xs opacity-50 italic">
                              📍 {contact.address}
                            </p>
                          )}
                        </div>

                        {/* Input Resi */}
                        <div className="flex-1 max-w-xs">
                          <div className="relative group">
                            <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 ml-1 mb-1 block">Nomor Resi</label>
                            <div className="relative flex items-center">
                              <input 
                                type="text" 
                                value={contact.resi}
                                onChange={(e) => updateResi(contact.id, e.target.value)}
                                placeholder="Input resi..."
                                className={`w-full pl-4 pr-12 py-2.5 rounded-xl border transition-all text-sm font-mono font-bold tracking-wider ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200 focus:border-jt-red focus:bg-white'}`}
                              />
                              <button 
                                onClick={() => openScanner(contact.id)}
                                className="absolute right-2 p-2 text-jt-red hover:bg-jt-red/10 rounded-lg transition-all"
                                title="Scan Barcode"
                              >
                                <Camera size={18} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 h-full">
                          <button 
                            onClick={() => openWhatsApp(contact)}
                            className={`flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
                              contact.resi 
                                ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md hover:shadow-emerald-200 dark:hover:shadow-none active:scale-95' 
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-700'
                            }`}
                          >
                            <Send size={18} />
                            <span>Kirim</span>
                            <ExternalLink size={14} className="opacity-50" />
                          </button>
                          
                          <button 
                            onClick={() => removeContact(contact.id)}
                            className="p-2.5 text-slate-300 hover:text-jt-red hover:bg-jt-light transition-all rounded-xl dark:hover:bg-slate-700"
                            title="Hapus"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                  <div className="w-24 h-24 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                    <LayoutGrid size={48} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    {searchTerm.trim() === '' ? 'Cari Kontak' : 'Kontak Tidak Ditemukan'}
                  </h3>
                  <p className="max-w-xs mx-auto">
                    {searchTerm.trim() === '' 
                      ? 'Masukkan nama atau nomor WA untuk menampilkan data dari database.' 
                      : 'Maaf, data yang Anda cari tidak ada dalam daftar lokal.'}
                  </p>
                </div>
              )}
            </AnimatePresence>

            {/* Bulk Actions at Bottom */}
            {contacts.length > 0 && (
              <div className="pt-8 flex justify-center">
                <button 
                  onClick={() => {
                    if (confirm('Hapus semua kontak?')) setContacts([]);
                  }}
                  className="text-sm font-medium text-slate-400 hover:text-jt-red flex items-center gap-2 transition-all p-2 rounded-lg hover:bg-jt-light"
                >
                  <Trash2 size={16} /> Clear Semua Daftar
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className={`mt-20 py-10 border-t ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 font-medium opacity-50'}`}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2 text-jt-red font-display font-bold">
             <Package size={20} />
             <span>J&T LALAN GERAI AINI</span>
          </div>
          <p className="text-xs">Express Your Online Business • Broadcast Manager System</p>
        </div>
      </footer>

      {/* Search Result Sync Status Banner - Removed for space, but logic kept in Sync */}

      <ScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScan={handleScanSuccess} 
      />

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}
            >
              <div className="jt-gradient p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database size={24} />
                  <h2 className="text-xl font-bold font-display">Integrasi Cloud</h2>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50">
                  <div>
                    <h4 className="font-bold text-sm">Sinkronisasi Otomatis</h4>
                    <p className="text-[10px] opacity-50">Kirim data sesaat setelah kontak ditambahkan</p>
                  </div>
                  <button 
                    onClick={() => setSettings({ ...settings, autoSync: !settings.autoSync })}
                    className={`w-12 h-6 rounded-full relative transition-all ${settings.autoSync ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  >
                    <motion.div 
                      animate={{ x: settings.autoSync ? 24 : 2 }}
                      className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>

                <div className={`p-4 rounded-2xl text-[10px] space-y-2 border ${isDarkMode ? 'bg-slate-900/50 border-slate-700 text-slate-400' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                  <p className="font-bold flex items-center gap-1"><Info size={12} /> CARA SETUP:</p>
                  <ol className="list-decimal ml-4 space-y-1">
                    <li>Buka Google Sheets &gt; Extensions &gt; Apps Script.</li>
                    <li>Hapus semua kode dan ganti dengan kode yang disediakan AI.</li>
                    <li>Deploy &gt; New Deployment &gt; Web App &gt; Execute as Me &gt; Who has access: Anyone.</li>
                    <li>Copy URL Web App dan tempel di atas.</li>
                  </ol>
                </div>

                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-full py-4 rounded-xl jt-gradient text-white font-bold hover:shadow-lg transition-all"
                >
                  Selesai & Simpan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
