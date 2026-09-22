"use client";

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Pencil, Trash2, ExternalLink, CarFront, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateVehicleAction, deleteVehicleAction } from '@/actions/admin';

export default function AdminVehicleTable({ initialVehicles }: { initialVehicles: any[] }) {
  const [vehicles, setVehicles] = useState(initialVehicles || []);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Function to load vehicles from Supabase and merge with localStorage cache
  const loadVehicles = async () => {
    setLoading(true);
    let combined: any[] = [];

    // 1. Get cached vehicles from localStorage
    try {
      const local = JSON.parse(localStorage.getItem('nexca_local_vehicles') || '[]');
      if (Array.isArray(local)) {
        combined = [...local];
      }
    } catch (e) {
      console.warn("Local cache read error:", e);
    }

    // 2. Fetch directly from Supabase in browser client
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*, vehicle_images(image_url, is_main)')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        // Merge Supabase vehicles with local cache (Supabase takes precedence by ID)
        const supabaseIds = new Set(data.map((v: any) => v.id));
        const localOnly = combined.filter((v: any) => !supabaseIds.has(v.id));
        combined = [...data, ...localOnly];
      }
    } catch (err) {
      console.warn("Could not fetch vehicles from Supabase client:", err);
    } finally {
      if (combined.length > 0) {
        setVehicles(combined);
      }
      setLoading(false);
    }
  };

  // Run on mount
  useEffect(() => {
    loadVehicles();
  }, []);



  const formatDate = (dateString: string) => {
    if (!dateString) return 'Just now';
    try {
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateString));
    } catch {
      return 'Recent';
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'available' ? 'sold' : 'available';
    
    // Update local state
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
    
    // Update localStorage
    try {
      const local = JSON.parse(localStorage.getItem('nexca_local_vehicles') || '[]');
      const updated = local.map((v: any) => v.id === id ? { ...v, status: newStatus } : v);
      localStorage.setItem('nexca_local_vehicles', JSON.stringify(updated));
    } catch (e) {}

    // Update Supabase
    try {
      await updateVehicleAction(id, { status: newStatus });
    } catch (e) {}
  };

  const deleteVehicle = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vehicle? This action cannot be undone.")) return;
    
    // Optimistic delete
    setVehicles(prev => prev.filter(v => v.id !== id));
    
    // Remove from localStorage
    try {
      const local = JSON.parse(localStorage.getItem('nexca_local_vehicles') || '[]');
      const filtered = local.filter((v: any) => v.id !== id);
      localStorage.setItem('nexca_local_vehicles', JSON.stringify(filtered));
    } catch (e) {}

    // Delete in Supabase
    try {
      await deleteVehicleAction(id);
    } catch (e) {}
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Table Header Controls */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <span className="text-sm font-semibold text-gray-700">
          Showing {vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'}
        </span>

        <button
          type="button"
          onClick={loadVehicles}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-blue-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin text-blue-600" : ""} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicle</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Added</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Color</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {vehicles.map(vehicle => {
              const mainImage = vehicle.vehicle_images?.find((img: any) => img.is_main)?.image_url 
                || vehicle.vehicle_images?.[0]?.image_url
                || '/Inventory.webp';

              return (
                <tr key={vehicle.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-12 w-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative">
                        <img 
                          className="h-full w-full object-cover" 
                          src={mainImage} 
                          alt="" 
                          onError={(e) => {
                            (e.target as HTMLElement).setAttribute('src', '/Inventory.webp');
                          }}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-gray-900 line-clamp-1">{vehicle.title}</div>
                        <div className="text-xs text-gray-500">{vehicle.make} {vehicle.model} • {vehicle.year}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{vehicle.chassis_no}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600 font-medium">
                      {formatDate(vehicle.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {vehicle.color || '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button 
                      type="button"
                      onClick={() => toggleStatus(vehicle.id, vehicle.status)}
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full cursor-pointer transition ${
                        vehicle.status === 'available' 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {vehicle.status === 'available' ? 'Available' : 'Sold'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-3">
                      <Link 
                        href={`/edit/${vehicle.id}`} 
                        className="text-indigo-600 hover:text-indigo-900 p-1 hover:bg-indigo-50 rounded"
                        title="Edit Vehicle"
                      >
                        <Pencil size={17} />
                      </Link>
                      <button 
                        type="button"
                        onClick={() => deleteVehicle(vehicle.id)} 
                        className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded cursor-pointer"
                        title="Delete Vehicle"
                      >
                        <Trash2 size={17} />
                      </button>
                      <Link 
                        href={`/cars/${vehicle.id}`} 
                        target="_blank" 
                        className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded"
                        title="View Public Listing"
                      >
                        <ExternalLink size={17} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {vehicles.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <CarFront className="h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-lg font-bold text-gray-800">No vehicles found</p>
                    <p className="text-sm text-gray-500 mt-1 mb-4">Click "Add New Vehicle" to publish your first vehicle listing.</p>
                    <Link
                      href="/add"
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl shadow transition"
                    >
                      + Add New Vehicle
                    </Link>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
