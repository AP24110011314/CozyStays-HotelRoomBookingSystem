import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { formatINR } from '../../utils/currency';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { Plus, Search, Edit2, Trash2, Power, X, Image as ImageIcon, CheckCircle2 } from 'lucide-react';

const roomSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['single', 'double', 'deluxe', 'suite']),
  description: z.string().min(1, 'Description is required').max(2000),
  basePrice: z.number().int().positive('Price must be positive integer (cents)'),
  maxGuests: z.number().int().positive('Max guests must be positive'),
  amenities: z.array(z.string()).default([]),
  photos: z.array(z.string().url('Must be valid URL')).default([]),
});

export default function AdminRooms() {
  useDocumentTitle('Room Management');
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [amenitiesInput, setAmenitiesInput] = useState('');
  const [photosInput, setPhotosInput] = useState('');

  const { data: roomsResponse, isLoading } = useQuery({
    queryKey: ['admin', 'rooms', searchTerm, typeFilter],
    queryFn: async () => {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (typeFilter) params.type = typeFilter;
      const response = await api.get('/admin/rooms', { params });
      return response.data;
    },
  });

  const rooms = roomsResponse?.data || [];

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
      toast.success('Room created successfully');
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
      toast.success('Room updated successfully');
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
      toast.success('Room availability toggled');
      queryClient.invalidateQueries({ queryKey: ['admin', 'rooms'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to toggle room');
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/rooms/${id}`),
    onSuccess: () => {
      toast.success('Room deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'rooms'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Cannot delete room with active or future bookings');
    },
  });

  const handleSubmitForm = (formData) => {
    if (editingRoom) {
      updateRoomMutation.mutate({ id: editingRoom.id, data: formData });
    } else {
      createRoomMutation.mutate(formData);
    }
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setAmenitiesInput((room.amenities || []).join(', '));
    setPhotosInput((room.photos || []).join(', '));
    reset({
      name: room.name,
      type: room.type,
      description: room.description,
      basePrice: room.basePrice,
      maxGuests: room.maxGuests,
      amenities: room.amenities || [],
      photos: room.photos || [],
    });
    setShowForm(true);
  };

  const handleDelete = (room) => {
    if (window.confirm(`Are you sure you want to delete "${room.name}"? This action cannot be undone.`)) {
      deleteRoomMutation.mutate(room.id);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRoom(null);
    setAmenitiesInput('');
    setPhotosInput('');
    reset();
  };

  const typeLabels = { single: 'Single', double: 'Double', deluxe: 'Deluxe', suite: 'Suite' };
  const typeBadgeClasses = {
    single: 'badge-forest',
    double: 'badge-taupe',
    deluxe: 'badge-brass',
    suite: 'badge-forest',
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">Room Catalog</h1>
          <p className="text-sm text-charcoal/60 mt-1">Manage all hotel rooms, active statuses, and specifications</p>
        </div>
        <button
          onClick={() => {
            setEditingRoom(null);
            setAmenitiesInput('');
            setPhotosInput('');
            reset({
              name: '',
              type: 'single',
              description: '',
              basePrice: 10000,
              maxGuests: 2,
              amenities: [],
              photos: [],
            });
            setShowForm(true);
          }}
          className="btn-primary w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Room
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-charcoal/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by room name or description..."
            className="input pl-10 text-sm"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input text-sm"
          >
            <option value="">All Types</option>
            <option value="single">Single</option>
            <option value="double">Double</option>
            <option value="deluxe">Deluxe</option>
            <option value="suite">Suite</option>
          </select>
        </div>
      </div>

      {/* Modal / Form Drawer */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-taupe w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-taupe">
              <h2 className="text-lg sm:text-xl font-bold text-charcoal">
                {editingRoom ? `Edit Room: ${editingRoom.name}` : 'Create New Room'}
              </h2>
              <button
                onClick={handleCancel}
                className="w-9 h-9 rounded-lg text-charcoal/40 hover:text-charcoal hover:bg-taupe/30 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(handleSubmitForm)} className="p-5 sm:p-6 overflow-y-auto space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="name" className="label">Room Name</label>
                  <input
                    id="name"
                    {...register('name')}
                    className="input"
                    placeholder="e.g. Deluxe Ocean View 302"
                  />
                  {errors.name && <p className="mt-1 text-xs text-brick">{errors.name.message}</p>}
                </div>

                <div>
                  <label htmlFor="type" className="label">Room Type</label>
                  <select id="type" {...register('type')} className="input">
                    <option value="single">Single</option>
                    <option value="double">Double</option>
                    <option value="deluxe">Deluxe</option>
                    <option value="suite">Suite</option>
                  </select>
                  {errors.type && <p className="mt-1 text-xs text-brick">{errors.type.message}</p>}
                </div>

                <div>
                  <label htmlFor="maxGuests" className="label">Max Guests</label>
                  <input
                    id="maxGuests"
                    type="number"
                    min="1"
                    {...register('maxGuests', { valueAsNumber: true })}
                    className="input"
                    placeholder="2"
                  />
                  {errors.maxGuests && <p className="mt-1 text-xs text-brick">{errors.maxGuests.message}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="basePrice" className="label">Base Price per Night (₹, e.g. 3500)</label>
                  <input
                    id="basePrice"
                    type="number"
                    min="100"
                    {...register('basePrice', { valueAsNumber: true })}
                    className="input"
                    placeholder="3500"
                  />
                  {errors.basePrice && <p className="mt-1 text-xs text-brick">{errors.basePrice.message}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="description" className="label">Description</label>
                  <textarea
                    id="description"
                    rows={3}
                    {...register('description')}
                    className="input min-h-[80px]"
                    placeholder="Describe room features, view, and furnishings..."
                  />
                  {errors.description && <p className="mt-1 text-xs text-brick">{errors.description.message}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="label">Amenities (comma-separated)</label>
                  <input
                    type="text"
                    value={amenitiesInput}
                    onChange={(e) => {
                      setAmenitiesInput(e.target.value);
                      setValue('amenities', e.target.value.split(',').map((s) => s.trim()).filter(Boolean));
                    }}
                    className="input"
                    placeholder="wifi, ac, tv, minibar, safe, balcony"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="label">Photo URLs (comma-separated valid URLs)</label>
                  <input
                    type="text"
                    value={photosInput}
                    onChange={(e) => {
                      setPhotosInput(e.target.value);
                      setValue('photos', e.target.value.split(',').map((s) => s.trim()).filter(Boolean));
                    }}
                    className="input"
                    placeholder="https://images.unsplash.com/..., https://..."
                  />
                  {errors.photos && <p className="mt-1 text-xs text-brick">{errors.photos.message}</p>}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-taupe">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRoomMutation.isPending || updateRoomMutation.isPending}
                  className="btn-primary"
                >
                  {editingRoom ? 'Save Changes' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rooms Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse flex items-center justify-between">
              <div className="space-y-2 w-1/3">
                <div className="h-4 bg-taupe/40 rounded w-full"></div>
                <div className="h-3 bg-taupe/20 rounded w-2/3"></div>
              </div>
              <div className="h-8 bg-taupe/40 rounded w-20"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-taupe-50 text-charcoal/70 font-semibold border-b border-taupe">
                  <th className="p-4 sm:p-5 sticky left-0 bg-taupe-50 z-10 min-w-[220px]">Room</th>
                  <th className="p-4 sm:p-5">Type</th>
                  <th className="p-4 sm:p-5">Price/Night</th>
                  <th className="p-4 sm:p-5">Max Guests</th>
                  <th className="p-4 sm:p-5">Status</th>
                  <th className="p-4 sm:p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-taupe">
                {rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-taupe-50/70 transition-colors">
                    <td className="p-4 sm:p-5 sticky left-0 bg-white z-10 font-medium text-charcoal border-r sm:border-r-0 border-taupe">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-taupe-100 flex-shrink-0 border border-taupe">
                          {room.photos && room.photos.length > 0 ? (
                            <img src={room.photos[0]} alt={room.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-charcoal/40">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-charcoal truncate">{room.name}</p>
                          <p className="text-xs text-charcoal/50 truncate max-w-[180px] sm:max-w-xs">{room.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 whitespace-nowrap">
                      <span className={typeBadgeClasses[room.type] || 'badge-taupe'}>
                        {typeLabels[room.type] || room.type}
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 font-semibold text-charcoal whitespace-nowrap">
                      {formatINR(room.basePrice)}
                    </td>
                    <td className="p-4 sm:p-5 text-charcoal/70 whitespace-nowrap">
                      {room.maxGuests} {room.maxGuests === 1 ? 'guest' : 'guests'}
                    </td>
                    <td className="p-4 sm:p-5 whitespace-nowrap">
                      <span className={room.active ? 'badge-success' : 'badge-brick'}>
                        {room.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => toggleRoomMutation.mutate(room.id)}
                          disabled={toggleRoomMutation.isPending}
                          className={`btn text-xs px-2.5 py-1.5 min-h-[36px] cursor-pointer ${
                            room.active
                              ? 'border border-brass text-brass-700 bg-brass-50 hover:bg-brass-100'
                              : 'border border-forest text-forest bg-forest-50 hover:bg-forest-100'
                          }`}
                          title={room.active ? 'Deactivate room' : 'Activate room'}
                        >
                          <Power className="w-3.5 h-3.5 mr-1" />
                          {room.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleEdit(room)}
                          className="btn-secondary text-xs px-2.5 py-1.5 min-h-[36px]"
                          title="Edit room"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(room)}
                          disabled={deleteRoomMutation.isPending}
                          className="btn-danger text-xs px-2.5 py-1.5 min-h-[36px]"
                          title="Delete room"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {rooms.length === 0 && (
              <div className="text-center py-12 px-4">
                <CheckCircle2 className="w-10 h-10 text-charcoal/30 mx-auto mb-3" />
                <p className="text-charcoal font-semibold">No rooms found</p>
                <p className="text-xs text-charcoal/50 mt-1">Try modifying your search or click &quot;Add Room&quot;</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
