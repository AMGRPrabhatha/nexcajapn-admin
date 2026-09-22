"use client";

import { useState } from "react";
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Sparkles, Image as ImageIcon, X, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { addVehicleAction } from '@/actions/admin';

export default function AddVehiclePage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string; details?: string } | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [mainIndex, setMainIndex] = useState(0);
  const [fallbackImageUrl, setFallbackImageUrl] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    chassis_no: "",
    make: "",
    model: "",
    year: "2020",
    color: "",
    mileage: "42000",
    transmission: "automatic",
    fuel_type: "petrol",
    description: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).slice(0, 5);
      setImages(selectedFiles);
      const urls = selectedFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(urls);
    }
  };

  const removeImage = (index: number) => {
    const updatedFiles = images.filter((_, i) => i !== index);
    const updatedUrls = previewUrls.filter((_, i) => i !== index);
    setImages(updatedFiles);
    setPreviewUrls(updatedUrls);
    // Adjust mainIndex when images are removed
    if (index === mainIndex) {
      setMainIndex(0);
    } else if (index < mainIndex) {
      setMainIndex(prev => prev - 1);
    }
  };

  // 1-Click Fill Sample Data
  const fillSampleData = () => {
    setFormData({
      title: "2021 Toyota Supra 3.0 RZ Premium",
      chassis_no: "DB42-0018492",
      make: "Toyota",
      model: "Supra",
      year: "2021",
      color: "Red",
      mileage: "24500",
      transmission: "automatic",
      fuel_type: "petrol",
      description: "Mint condition Japanese domestic market Toyota Supra RZ. Single owner in Tokyo, full dealer service records, JBL premium sound, adaptive suspension, red sports interior.",
    });
    setFallbackImageUrl("/Inventory.webp");
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const vehiclePayload = {
        title: formData.title.trim(),
        make: formData.make.trim(),
        model: formData.model.trim(),
        year: parseInt(formData.year) || 2020,
        color: formData.color.trim(),
        mileage: parseInt(formData.mileage) || 0,
        transmission: formData.transmission,
        fuel_type: formData.fuel_type,
        chassis_no: formData.chassis_no.trim(),
        description: formData.description.trim(),
        status: "available"
      };

      const imageUrlsToInsert: string[] = [];

      // 2. Upload file images if selected (reorder so main image is first)
      if (images.length > 0) {
        const orderedImages = [...images];
        if (mainIndex > 0 && mainIndex < orderedImages.length) {
          const [mainImg] = orderedImages.splice(mainIndex, 1);
          orderedImages.unshift(mainImg);
        }
        for (let i = 0; i < orderedImages.length; i++) {
          const file = orderedImages[i];
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
                imageUrlsToInsert.push(publicUrlData.publicUrl);
              }
            } else {
              console.warn("Storage upload warning:", uploadError.message);
            }
          } catch (storageErr) {
            console.warn("Storage error:", storageErr);
          }
        }
      }

      // 3. Fallback image if no files uploaded or storage upload skipped
      if (imageUrlsToInsert.length === 0) {
        imageUrlsToInsert.push(fallbackImageUrl.trim() || '/Inventory.webp');
      }

      // 4. Call server action to insert database records securely
      const vehicle = await addVehicleAction(vehiclePayload, imageUrlsToInsert);

      // 5. Store in localStorage cache for instant synchronization across admin & public views
      try {
        const cached = JSON.parse(localStorage.getItem('nexca_local_vehicles') || '[]');
        const fullVehicleObj = {
          ...vehicle,
          ...vehiclePayload,
          id: vehicle?.id || `local-${Date.now()}`,
          created_at: vehicle?.created_at || new Date().toISOString(),
          vehicle_images: imageUrlsToInsert.map((url, idx) => ({
            image_url: url,
            is_main: idx === 0
          }))
        };
        const updatedCache = [fullVehicleObj, ...cached.filter((v: any) => v.id !== fullVehicleObj.id)];
        localStorage.setItem('nexca_local_vehicles', JSON.stringify(updatedCache));
      } catch (cacheErr) {
        console.warn("Cache save warning:", cacheErr);
      }

      setMessage({ 
        type: 'success', 
        text: 'Vehicle added successfully! Redirecting to admin dashboard...' 
      });

      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1000);

    } catch (error: any) {
      console.error("Add vehicle error:", error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to add vehicle.',
        details: 'If you see an RLS or permission error, check Supabase Dashboard -> Table Editor -> vehicles -> RLS Policies to ensure INSERT is allowed.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header & Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition mb-2">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Add New Vehicle</h2>
        </div>

        {/* 1-Click Test Button */}
        <button
          type="button"
          onClick={fillSampleData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-sm font-semibold transition active:scale-95 cursor-pointer shadow-sm"
        >
          <Sparkles size={16} />
          Auto-Fill Sample Data
        </button>
      </div>

      {/* Message Banners */}
      {message && (
        <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 border ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border-green-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="text-sm">
            <p className="font-semibold">{message.text}</p>
            {message.details && (
              <p className="text-xs text-red-600 mt-1">{message.details}</p>
            )}
          </div>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Listing Title *
              </label>
              <input
                required
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="e.g. 2020 Toyota Supra RZ"
              />
            </div>

            {/* Chassis No */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Chassis No. *
              </label>
              <input
                required
                type="text"
                name="chassis_no"
                value={formData.chassis_no}
                onChange={handleInputChange}
                className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition uppercase"
                placeholder="e.g. DB42-0018492"
              />
            </div>

            {/* Make */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Make *
              </label>
              <input
                required
                type="text"
                name="make"
                value={formData.make}
                onChange={handleInputChange}
                className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="e.g. Toyota"
              />
            </div>

            {/* Model */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Model *
              </label>
              <input
                required
                type="text"
                name="model"
                value={formData.model}
                onChange={handleInputChange}
                className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="e.g. Supra"
              />
            </div>

            {/* Year */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Year *
              </label>
              <input
                required
                type="number"
                name="year"
                min="1970"
                max="2030"
                value={formData.year}
                onChange={handleInputChange}
                className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="2020"
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Color *
              </label>
              <input
                required
                type="text"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
                className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="e.g. White Pearl"
              />
            </div>

            {/* Mileage */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Mileage (km) *
              </label>
              <input
                required
                type="number"
                name="mileage"
                min="0"
                value={formData.mileage}
                onChange={handleInputChange}
                className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="45000"
              />
            </div>

            {/* Transmission */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Transmission
              </label>
              <select
                name="transmission"
                value={formData.transmission}
                onChange={handleInputChange}
                className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
              >
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
                <option value="cvt">CVT</option>
              </select>
            </div>

            {/* Fuel Type */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Fuel Type
              </label>
              <select
                name="fuel_type"
                value={formData.fuel_type}
                onChange={handleInputChange}
                className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
              >
                <option value="petrol">Petrol</option>
                <option value="hybrid">Hybrid</option>
                <option value="diesel">Diesel</option>
                <option value="electric">Electric</option>
              </select>
            </div>

            {/* Fallback Image URL */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Direct Image URL (Optional)
              </label>
              <input
                type="text"
                value={fallbackImageUrl}
                onChange={(e) => setFallbackImageUrl(e.target.value)}
                className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="https://... or /Inventory.webp"
              />
            </div>
          </div>

          {/* Upload Images */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Vehicle Photos (Max 5 files)
            </label>
            <div className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-2xl p-5 text-center transition bg-gray-50/50">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="vehicle-photo-upload"
              />
              <label htmlFor="vehicle-photo-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <ImageIcon size={20} />
                </div>
                <span className="text-sm font-semibold text-gray-800">
                  Click to choose photos from your device
                </span>
                <span className="text-xs text-gray-500">
                  Supports JPG, PNG, WEBP (Up to 5 images)
                </span>
              </label>
            </div>

            {/* Image Previews */}
            {previewUrls.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">Click an image to set it as the main thumbnail</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {previewUrls.map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() => setMainIndex(idx)}
                      className={`relative aspect-video rounded-xl overflow-hidden border-2 group bg-gray-100 shadow-sm cursor-pointer transition ${
                        idx === mainIndex
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow"
                      >
                        <X size={13} />
                      </button>
                      {idx === mainIndex ? (
                        <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                          ★ Main
                        </span>
                      ) : (
                        <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">
                          Set as main
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Description *
            </label>
            <textarea
              required
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
              className="w-full border border-gray-300 p-3.5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Provide vehicle details, condition, features, grade sheet info, auction records..."
            />
          </div>

          {/* Submit Button */}
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
                  <span>Publishing Vehicle...</span>
                </>
              ) : (
                <span>Add Vehicle</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
