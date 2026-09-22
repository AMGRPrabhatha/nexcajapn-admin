"use client";

import { useState, useEffect, use } from "react";
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { updateVehicleAction } from '@/actions/admin';
import { X, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [vehicle, setVehicle] = useState<any>(null);

  // Image management
  const [existingImages, setExistingImages] = useState<{ id: string; image_url: string; is_main: boolean }[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  useEffect(() => {
    const fetchVehicle = async () => {
      // Fetch vehicle data
      const { data, error } = await supabase
        .from('vehicles')
        .select('*, vehicle_images(id, image_url, is_main)')
        .eq('id', id)
        .single();
        
      if (error) {
        alert("Error loading vehicle");
        router.push('/');
        return;
      }
      setVehicle(data);
      setExistingImages(data.vehicle_images || []);
      setFetching(false);
    };
    fetchVehicle();
  }, [id]);

  const removeExistingImage = (imageId: string) => {
    setExistingImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleNewImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).slice(0, 5);
      setNewFiles(prev => [...prev, ...selectedFiles]);
      const urls = selectedFiles.map(file => URL.createObjectURL(file));
      setNewPreviews(prev => [...prev, ...urls]);
    }
  };

  const removeNewImage = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    setNewPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const vehicleData = {
        title: formData.get("title") as string,
        make: formData.get("make") as string,
        model: formData.get("model") as string,
        year: parseInt(formData.get("year") as string),
        color: formData.get("color") as string,
        mileage: parseInt(formData.get("mileage") as string),
        transmission: formData.get("transmission") as string,
        fuel_type: formData.get("fuel_type") as string,
        chassis_no: formData.get("chassis_no") as string,
        description: formData.get("description") as string,
      };

      // Upload new images to storage
      const newImageUrls: string[] = [];
      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        const fileExt = file.name.split('.').pop() || 'jpg';
        const safeName = `car-${Date.now()}-${i}.${fileExt}`;

        try {
          const { error: uploadError } = await supabase.storage
            .from('car-images')
            .upload(safeName, file, { upsert: true });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('car-images')
              .getPublicUrl(safeName);
            if (publicUrlData?.publicUrl) {
              newImageUrls.push(publicUrlData.publicUrl);
            }
          } else {
            console.warn("Storage upload warning:", uploadError.message);
          }
        } catch (storageErr) {
          console.warn("Storage error:", storageErr);
        }
      }

      // Pass kept existing images + new uploaded URLs to server action
      const keptImages = existingImages.map(img => ({ image_url: img.image_url }));
      await updateVehicleAction(id, vehicleData, keptImages, newImageUrls);

      router.push('/');
      router.refresh();
      
    } catch (error: any) {
      alert("Error updating vehicle: " + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-8 text-gray-500">Loading vehicle data...</div>;
  if (!vehicle) return <div className="p-8 text-red-500">Vehicle not found.</div>;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition mb-2">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Edit Vehicle</h2>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Listing Title *</label>
              <input required type="text" name="title" defaultValue={vehicle.title} className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Chassis No. *</label>
              <input required type="text" name="chassis_no" defaultValue={vehicle.chassis_no} className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition uppercase" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Make *</label>
              <input required type="text" name="make" defaultValue={vehicle.make} className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Model *</label>
              <input required type="text" name="model" defaultValue={vehicle.model} className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Year *</label>
              <input required type="number" name="year" defaultValue={vehicle.year} className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Color *</label>
              <input required type="text" name="color" defaultValue={vehicle.color} className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder="e.g. White Pearl" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Mileage (km) *</label>
              <input required type="number" name="mileage" defaultValue={vehicle.mileage} className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Transmission</label>
              <select name="transmission" defaultValue={vehicle.transmission} className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white">
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
                <option value="cvt">CVT</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Fuel Type</label>
              <select name="fuel_type" defaultValue={vehicle.fuel_type} className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white">
                <option value="petrol">Petrol</option>
                <option value="hybrid">Hybrid</option>
                <option value="diesel">Diesel</option>
                <option value="electric">Electric</option>
              </select>
            </div>
          </div>

          {/* ── Existing Images ── */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Current Images ({existingImages.length})
            </label>
            {existingImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {existingImages.map((img, idx) => (
                  <div key={img.id} className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 group bg-gray-100 shadow-sm">
                    <img src={img.image_url} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(img.id)}
                      className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow"
                      title="Remove image"
                    >
                      <X size={14} />
                    </button>
                    {idx === 0 && (
                      <span className="absolute bottom-1.5 left-1.5 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        Main
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No images attached to this vehicle.</p>
            )}
          </div>

          {/* ── Add New Images ── */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Add More Images
            </label>
            <div className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-2xl p-5 text-center transition bg-gray-50/50">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleNewImages}
                className="hidden"
                id="edit-photo-upload"
              />
              <label htmlFor="edit-photo-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <ImageIcon size={20} />
                </div>
                <span className="text-sm font-semibold text-gray-800">Click to add more photos</span>
                <span className="text-xs text-gray-500">Supports JPG, PNG, WEBP</span>
              </label>
            </div>

            {newPreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {newPreviews.map((url, idx) => (
                  <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 group bg-gray-100 shadow-sm">
                    <img src={url} alt={`New ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNewImage(idx)}
                      className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow"
                      title="Remove image"
                    >
                      <X size={14} />
                    </button>
                    <span className="absolute bottom-1.5 left-1.5 bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      New
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Description *</label>
            <textarea required name="description" defaultValue={vehicle.description} rows={4} className="w-full border border-gray-300 p-3.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl disabled:opacity-50 transition active:scale-98 shadow-md flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
