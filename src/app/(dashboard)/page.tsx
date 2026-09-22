import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import AdminVehicleTable from '@/components/AdminVehicleTable';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const supabase = await createClient();
  
  let vehicles: any[] = [];
  try {
    const fetchPromise = supabase
      .from('vehicles')
      .select('*, vehicle_images(image_url, is_main)')
      .order('created_at', { ascending: false });

    const timeoutPromise = new Promise<any>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 50)
    );

    const res = await Promise.race([fetchPromise, timeoutPromise]);
    if (res?.data) {
      vehicles = res.data;
    }
  } catch (err) {
    console.warn("Admin server fetch timed out or offline, client will fetch.");
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Manage Vehicles</h2>
        <Link href="/add" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-center sm:text-left self-start sm:self-auto">
          + Add New Vehicle
        </Link>
      </div>
      
      <AdminVehicleTable initialVehicles={vehicles || []} />
    </div>
  );
}
