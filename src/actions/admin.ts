"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

// Middleware checks cookies, but we double-check for safety
async function requireAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get('nexca_admin_session');
  if (!session || session.value !== 'authenticated') {
    throw new Error("Unauthorized");
  }
}

export async function addVehicleAction(vehiclePayload: any, imageUrlsToInsert: string[]) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .insert([vehiclePayload])
    .select()
    .single();

  if (vehicleError) {
    throw new Error(`Database error: ${vehicleError.message}`);
  }

  if (imageUrlsToInsert.length > 0) {
    const imageRecords = imageUrlsToInsert.map((url, idx) => ({
      vehicle_id: vehicle.id,
      image_url: url,
      is_main: idx === 0
    }));

    const { error: imgInsertError } = await supabase
      .from('vehicle_images')
      .insert(imageRecords);

    if (imgInsertError) {
      console.warn("Could not insert vehicle_images records:", imgInsertError.message);
    }
  }

  return vehicle;
}

export async function updateVehicleAction(id: string, vehiclePayload: any, currentImages?: any[], newImages?: string[]) {
  await requireAdmin();
  const supabase = createAdminClient();

  // 1. Update vehicle data
  const { error: updateError } = await supabase
    .from('vehicles')
    .update(vehiclePayload)
    .eq('id', id);

  if (updateError) {
    throw new Error(`Database update error: ${updateError.message}`);
  }

  // 2. If images are provided, update them
  if (currentImages !== undefined && newImages !== undefined) {
    const { error: deleteImgError } = await supabase
      .from('vehicle_images')
      .delete()
      .eq('vehicle_id', id);

    if (deleteImgError) {
      throw new Error(`Error deleting old images: ${deleteImgError.message}`);
    }

    const allImageUrls = [
      ...currentImages.map((img) => img.image_url),
      ...newImages
    ];

    if (allImageUrls.length > 0) {
      const imageRecords = allImageUrls.map((url, idx) => ({
        vehicle_id: id,
        image_url: url,
        is_main: idx === 0
      }));

      const { error: imgInsertError } = await supabase
        .from('vehicle_images')
        .insert(imageRecords);

      if (imgInsertError) {
        console.warn("Could not insert vehicle_images records:", imgInsertError.message);
      }
    }
  }

  return { success: true };
}

export async function deleteVehicleAction(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }

  return { success: true };
}

export async function addGalleryItemAction(payload: any) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('gallery_items')
    .insert([payload]);

  if (error) {
    throw new Error(error.message);
  }

  return { success: true };
}

export async function deleteGalleryItemAction(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('gallery_items')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  return { success: true };
}
