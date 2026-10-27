import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../api/client';
import toast from 'react-hot-toast';

const roomSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['single', 'double', 'suite']),
  description: z.string().min(1, 'Description is required').max(2000),
  basePrice: z.number().int().positive('Price must be positive'),
  maxGuests: z.number().int().positive('Max guests must be positive'),
  amenities: z.array(z.string()).default([]),
  photos: z.array(z.string().url()).default([]),
});

export default function AdminRooms() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'rooms'],
    queryFn: async () => {
      const response = await api.get('/rooms');
      return response.data.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      name: '',
      type: 'single',
      description: '',
      basePrice: 10000,
      maxGuests: 2,
      amenities: [],
      photos: [],
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: (data) => api.post('/admin/rooms', data),
    onSuccess: () => {
      toast.success('Room created');
      queryClient.invalidateQueries({ queryKey: ['admin', 'rooms'] });
      setShowForm(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create room');
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/admin/rooms/${id}`, data),
    onSuccess: () => {
      toast.success('Room updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'rooms'] });
      setEditingRoom(null);
      setShowForm(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update room');
    },
  });

  const toggleRoomMutation = useMutation({
    mutationFn: (id) => api.patch(`/admin/rooms/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'rooms'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to toggle room');
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/rooms/${id}`),
    onSuccess: () => {
      toast.success('Room deleted');
      queryClient.invalidateQueries({ queryKey: ['admin', 'rooms'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete room');
    },
  });

  const handleSubmitForm = (data) => {
    if (editingRoom) {
      updateRoomMutation.mutate({ id: editingRoom.id, data });
    } else {
      createRoomMutation.mutate(data);
    }
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setShowForm(true);
    reset({
      name: room.name,
      type: room.type,
      description: room.description,
      basePrice: room.basePrice,
      maxGuests: room.maxGuests,
      amenities: room.amenities || [],
      photos: room.photos || [],
    });
  };

  const handleToggle = (room) => {
    toggleRoomMutation.mutate(room.id);
  };

  const handleDelete = (room) => {
    if (window.confirm(`Delete room "${room.name}"? This cannot be undone.`)) {
      deleteRoomMutation.mutate(room.id);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRoom(null);
    reset();
  };

  const [amenities, setAmenities] = useState('');
  const [photos, setPhotos] = useState('');

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Room Management</h1>
        <button
          onClick={() => { setEditingRoom(null); reset(); setShowForm(true); }}
          className="btn-primary"
        >
          Add Room
        </button>
      </div>

      {showForm && (
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {editingRoom ? 'Edit Room' : 'Create New Room'}
          </h2>
          <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="name" className="label">Name</label>
                <input
                  id="name"
                  {...register('name')}
                  className="input"
                  placeholder="Deluxe Suite"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
              </div>

              <div>
                <label htmlFor="type" className="label">Type</label>
                <select id="type" {...register('type')} className="input">
                  <option value="single">Single</option>
                  <option value="double">Double</option>
                  <option value="suite">Suite</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="label">Description</label>
                <textarea
                  id="description"
                  {...register('description')}
                  className="input min-h-[100px]"
                  placeholder="Room description..."
                />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
              </div>

              <div>
                <label htmlFor="basePrice" className="label">Base Price (cents)</label>
                <input
                  id="basePrice"
                  type="number"
                  {...register('basePrice', { valueAsNumber: true })}
                  className="input"
                  placeholder="10000"
                />
                {errors.basePrice && <p className="mt-1 text-sm text-red-600">{errors.basePrice.message}</p>}
              </div>

              <div>
                <label htmlFor="maxGuests" className="label">Max Guests</label>
                <input
                  id="maxGuests"
                  type="number"
                  {...register('maxGuests', { valueAsNumber: true })}
                  className="input"
                  placeholder="2"
                />
                {errors.maxGuests && <p className="mt-1 text-sm text-red-600">{errors.maxGuests.message}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="label">Amenities (comma-separated)</label>
                <input
                  type="text"
                  value={amenities}
                  onChange={(e) => {
                    setAmenities(e.target.value);
                    setValue('amenities', e.target.value.split(',').map(s => s.trim()).filter(Boolean));
                  }}
                  className="input"
                  placeholder="wifi, air conditioning, tv, minibar"
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">Photos (comma-separated URLs)</label>
                <input
                  type="text"
                  value={photos}
                  onChange={(e) => {
                    setPhotos(e.target.value);
                    setValue('photos', e.target.value.split(',').map(s => s.trim()).filter(Boolean));
                  }}
                  className="input"
                  placeholder="https://example.com/photo1.jpg, https://example.com/photo2.jpg"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-gray-200">
              <button type="submit" disabled={createRoomMutation.isPending || updateRoomMutation.isPending} className="btn-primary">
                {editingRoom ? 'Update Room' : 'Create Room'}
              </button>
              <button type="button" onClick={handleCancel} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-6">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-600 border-b border-gray-200">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Price/Night</th>
                <th className="pb-3 font-medium">Max Guests</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.map((room) => (
                <tr key={room.id} className="hover:bg-gray-50">
                  <td className="py-4 font-medium">{room.name}</td>
                  <td className="py-4">
                    <span className="badge-info">{room.type}</span>
                  </td>
                  <td className="py-4">${(room.basePrice / 100).toFixed(2)}</td>
                  <td className="py-4">{room.maxGuests}</td>
                  <td className="py-4">
                    <span className={room.active ? 'badge-success' : 'badge-gray'}>
                      {room.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(room)}
                        disabled={toggleRoomMutation.isPending}
                        className={`text-sm font-medium ${room.active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                      >
                        {room.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleEdit(room)}
                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(room)}
                        disabled={deleteRoomMutation.isPending}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">No rooms found. Click &quot;Add Room&quot; to create one.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}