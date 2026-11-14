import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Pencil, Eye, EyeOff, Plus, Loader2 } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';

const AdminSnacks = () => {
    // ==========================================
    // 1. CÁC STATE QUẢN LÝ DỮ LIỆU VÀ LỌC
    // ==========================================
    const [cinemas, setCinemas] = useState([]);
    const [selectedCinemaId, setSelectedCinemaId] = useState('');
    const [filterCategory, setFilterCategory] = useState('all'); // State bộ lọc phân loại mới

    const [masterSnacks, setMasterSnacks] = useState([]);
    const [cinemaSnacks, setCinemaSnacks] = useState([]);
    const [loading, setLoading] = useState(false);

    // ==========================================
    // 2. STATE ĐIỀU KHIỂN CÁC MODAL
    // ==========================================
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingSnack, setEditingSnack] = useState(null);

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [targetSnack, setTargetSnack] = useState(null);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [addMode, setAddMode] = useState('existing');
    const [addFormData, setAddFormData] = useState({
        cinemaId: '',
        masterSnackId: '',
        name: '',
        category: 'popcorn',
        price: '',
        imageUrl: ''
    });

    // ==========================================
    // 3. CÁC HÀM FETCH DỮ LIỆU GIẢ LẬP (MOCK)
    // ==========================================
    /*const fetchCinemas = async () => {
        setCinemas([
            { id: '1', name: 'CGV Sư Vạn Hạnh', city: 'TP. Hồ Chí Minh' },
            { id: '2', name: 'SilverScreen Đà Nẵng', city: 'Đà Nẵng' },
            { id: '3', name: 'Lotte Cinema', city: 'Hà Nội' }
        ]);
    };

    const fetchMasterSnacks = async () => {
        setMasterSnacks([
            { id: 'snack-1', name: 'Bắp phô mai khổng lồ', price: 65000, category: 'popcorn', imageUrl: 'https://placehold.co/60x60' },
            { id: 'snack-2', name: 'Pepsi tươi size L', price: 45000, category: 'drink', imageUrl: 'https://placehold.co/60x60' },
            { id: 'snack-3', name: 'Combo 2 Bắp 1 Nước', price: 120000, category: 'combo', imageUrl: 'https://placehold.co/60x60' }
        ]);
    };

    const fetchCinemaSnacks = async () => {
        setLoading(true);
        setTimeout(() => {
            setCinemaSnacks([
                { snackId: 'snack-1', name: 'Bắp phô mai khổng lồ', price: 70000, isAvailable: true, category: 'popcorn', imageUrl: 'https://placehold.co/60x60', description: 'Bắp rang bơ phô mai thơm lừng' },
                { snackId: 'snack-2', name: 'Pepsi tươi size L', price: 50000, isAvailable: false, category: 'drink', imageUrl: 'https://placehold.co/60x60', description: 'Giải khát cực đã' }
            ]);
            setLoading(false);
        }, 500);
    };*/
    // ==========================================
    // 3. CÁC HÀM GỌI API THẬT TỪ DATABASE
    // ==========================================
    const fetchCinemas = async () => {
        try {
            const res = await axiosInstance.get('/api/cinemas');
            setCinemas(res.data);
        } catch  {
            toast.error('Không thể tải danh sách rạp từ hệ thống!');
        }
    };

    const fetchMasterSnacks = async () => {
        try {
            const res = await axiosInstance.get('/api/snacks'); // Kho tổng master snacks
            setMasterSnacks(res.data);
        } catch  {
            toast.error('Không thể tải dữ liệu kho tổng!');
        }
    };

    const fetchCinemaSnacks = async (cinemaId) => {
        if (!cinemaId) return;
        setLoading(true);
        try {
            const res = await axiosInstance.get(`/api/cinemas/${cinemaId}/snacks`);
            setCinemaSnacks(res.data);
        } catch  {
            toast.error('Không thể tải thực đơn bắp nước của rạp!');
            setCinemaSnacks([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCinemas();
        fetchMasterSnacks();
    }, []);

    useEffect(() => {
        if (selectedCinemaId) {
            fetchCinemaSnacks();
        } else {
            setCinemaSnacks([]);
        }
        // Reset bộ lọc mỗi khi đổi rạp
        setFilterCategory('all');
    }, [selectedCinemaId]);


    // ==========================================
    // 4. CÁC HÀM XỬ LÝ SỰ KIỆN CỦA MODAL
    // ==========================================
    const handleOpenConfirmModal = (snack) => {
        setTargetSnack(snack);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmToggle = () => {
        if (!targetSnack) return;
        setCinemaSnacks(prev => prev.map(s =>
            s.snackId === targetSnack.snackId ? { ...s, isAvailable: !targetSnack.isAvailable } : s
        ));
        toast.success(targetSnack.isAvailable ? 'Đã ẩn món khỏi thực đơn!' : 'Đã mở bán lại món!');
        setIsConfirmModalOpen(false);
    };

    const handleOpenEditModal = (snack) => {
        setEditingSnack({ ...snack });
        setIsEditModalOpen(true);
    };

    const handleSaveUpdate = () => {
        setCinemaSnacks(prev => prev.map(s =>
            s.snackId === editingSnack.snackId ? { ...s, ...editingSnack } : s
        ));
        toast.success('Cập nhật thông tin món thành công!');
        setIsEditModalOpen(false);
    };

    const handleOpenAddModal = () => {
        setAddFormData({
            cinemaId: selectedCinemaId || '',
            masterSnackId: '',
            name: '',
            category: 'popcorn',
            price: '',
            imageUrl: ''
        });
        setAddMode('existing');
        setIsAddModalOpen(true);
    };

    const handleConfirmAdd = () => {
        if (!addFormData.cinemaId) return toast.error('Vui lòng chọn cụm rạp!');
        if (addMode === 'existing' && !addFormData.masterSnackId) return toast.error('Vui lòng chọn món từ kho!');
        if (addMode === 'new' && (!addFormData.name || !addFormData.imageUrl)) return toast.error('Vui lòng nhập đủ tên và ảnh!');
        if (!addFormData.price) return toast.error('Vui lòng nhập giá bán!');

        setIsAdding(true);

        setTimeout(() => {
            const newSnackMock = {
                snackId: addMode === 'existing' ? addFormData.masterSnackId : `new-${Date.now()}`,
                name: addFormData.name,
                category: addFormData.category,
                imageUrl: addFormData.imageUrl,
                price: parseFloat(addFormData.price),
                isAvailable: true,
                description: addMode === 'existing' ? 'Đồng bộ từ kho tổng' : 'Tạo mới nội bộ'
            };

            // Nếu thêm vào rạp đang chọn, đẩy món mới LÊN ĐẦU danh sách
            if (addFormData.cinemaId === selectedCinemaId) {
                setCinemaSnacks(prev => [newSnackMock, ...prev]);
            }

            toast.success('Thêm món vào rạp thành công!');
            setIsAdding(false);
            setIsAddModalOpen(false);
        }, 800);
    };

    const handleMasterSnackSelect = (masterId) => {
        const found = masterSnacks.find(s => s.id === masterId);
        if (found) {
            setAddFormData(prev => ({
                ...prev,
                masterSnackId: masterId,
                name: found.name,
                category: found.category,
                imageUrl: found.imageUrl
            }));
        }
    };

    // Áp dụng bộ lọc phân loại trước khi render
    const filteredSnacks = cinemaSnacks.filter(snack => filterCategory === 'all' || snack.category === filterCategory);


    // ==========================================
    // 5. GIAO DIỆN (JSX)
    // ==========================================
    return (
        <div className="p-6 bg-[#0f0f16] min-h-screen text-gray-200">
            <Toaster position="top-right" reverseOrder={false} />

            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Menu Bắp Nước Theo Rạp</h1>
                    <p className="text-sm text-gray-400">Cấu hình danh mục, giá bán và trạng thái món ăn cho từng cụm rạp.</p>
                </div>
                <button
                    onClick={handleOpenAddModal}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-5 rounded-lg shadow-lg transition-colors"
                >
                    <Plus size={20} />
                    Thêm món mới
                </button>
            </div>

            {/* BỘ LỌC */}
            <div className="bg-[#151521] border border-gray-800 rounded-xl p-6 mb-8 flex gap-6">
                <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">1. Xem thực đơn của rạp</label>
                    <select
                        className="w-full bg-[#1e1e2d] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                        value={selectedCinemaId}
                        onChange={(e) => setSelectedCinemaId(e.target.value)}
                    >
                        <option value="">-- Vui lòng chọn rạp để xem --</option>
                        {cinemas.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Phân loại món</label>
                    {/* Select box đã được gán state filterCategory */}
                    <select
                        className="w-full bg-[#1e1e2d] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                    >
                        <option value="all">Tất cả món</option>
                        <option value="popcorn">Đồ ăn nhẹ</option>
                        <option value="drink">Nước giải khát</option>
                        <option value="combo">Combo</option>
                    </select>
                </div>
            </div>

            {/* BẢNG DANH SÁCH MÓN ĂN */}
            {selectedCinemaId && (
                <div className="bg-[#151521] border border-gray-800 rounded-xl overflow-hidden mb-8">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#1e1e2d] border-b border-gray-800">
                                <th className="px-6 py-4 text-sm font-semibold text-gray-300">Hình ảnh</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-300">Tên món & Mô tả</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-300">Phân loại</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-300">Giá bán (VNĐ)</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-300 text-center">Trạng thái</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-300 text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-8 text-gray-400">Đang tải dữ liệu...</td></tr>
                            ) : filteredSnacks.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-8 text-gray-400">Không tìm thấy món nào phù hợp với bộ lọc.</td></tr>
                            ) : (
                                filteredSnacks.map((snack) => (
                                    <tr key={snack.snackId} className="border-b border-gray-800 hover:bg-[#1e1e2d]/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <img src={snack.imageUrl} alt={snack.name} className="w-12 h-12 rounded object-cover" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-white">{snack.name}</p>
                                            <p className="text-xs text-gray-500 mt-1">{snack.description}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 bg-gray-800 text-gray-300 text-xs rounded-full border border-gray-700">
                                                {snack.category === 'popcorn' ? 'Đồ ăn nhẹ' : snack.category === 'drink' ? 'Nước giải khát' : 'Combo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-[#00ff88]">
                                            {snack.price.toLocaleString('vi-VN')} đ
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${snack.isAvailable ? 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${snack.isAvailable ? 'bg-[#00ff88]' : 'bg-gray-500'}`}></span>
                                                {snack.isAvailable ? 'Đang kinh doanh' : 'Tạm ngừng bán'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <button
                                                    onClick={() => handleOpenConfirmModal(snack)}
                                                    className={`${snack.isAvailable ? 'text-orange-400 hover:text-orange-300' : 'text-green-400 hover:text-green-300'} transition-colors`}
                                                    title={snack.isAvailable ? 'Ẩn món này' : 'Mở bán lại'}
                                                >
                                                    {snack.isAvailable ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                                <button onClick={() => handleOpenEditModal(snack)} className="text-blue-400 hover:text-blue-300 transition-colors" title="Sửa thông tin">
                                                    <Pencil size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MODAL 1: THÊM MÓN MỚI */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-10">
                    <div className="bg-[#1e1e2d] w-full max-w-xl rounded-xl shadow-2xl p-6 text-gray-200 border border-gray-700 relative m-auto">
                        <h2 className="text-xl font-bold text-white mb-6">Thêm món vào thực đơn rạp</h2>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Chọn Rạp áp dụng</label>
                                <select
                                    value={addFormData.cinemaId}
                                    onChange={(e) => setAddFormData({ ...addFormData, cinemaId: e.target.value })}
                                    className="w-full bg-[#151521] border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">-- Chọn rạp --</option>
                                    {cinemas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            <div className="flex gap-4 p-1 bg-[#151521] rounded-lg border border-gray-700">
                                <button
                                    onClick={() => setAddMode('existing')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${addMode === 'existing' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Chọn từ kho tổng
                                </button>
                                <button
                                    onClick={() => {
                                        setAddMode('new');
                                        setAddFormData(prev => ({ ...prev, masterSnackId: '', name: '', imageUrl: '' }));
                                    }}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${addMode === 'new' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Tạo món mới nội bộ
                                </button>
                            </div>

                            {addMode === 'existing' ? (
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Chọn món có sẵn</label>
                                    <select
                                        value={addFormData.masterSnackId}
                                        onChange={(e) => handleMasterSnackSelect(e.target.value)}
                                        className="w-full bg-[#151521] border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="">-- Chọn món từ Master Snacks --</option>
                                        {masterSnacks.map(s => <option key={s.id} value={s.id}>{s.name} (Kho: {s.price.toLocaleString()}đ)</option>)}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Tên món mới</label>
                                    <input
                                        type="text"
                                        placeholder="Nhập tên món..."
                                        value={addFormData.name}
                                        onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                                        className="w-full bg-[#151521] border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            )}

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm text-gray-400 mb-1">Phân loại</label>
                                    <select
                                        value={addFormData.category}
                                        onChange={(e) => setAddFormData({ ...addFormData, category: e.target.value })}
                                        disabled={addMode === 'existing'}
                                        className={`w-full bg-[#151521] border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 ${addMode === 'existing' ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        <option value="popcorn">Đồ ăn nhẹ</option>
                                        <option value="drink">Nước giải khát</option>
                                        <option value="combo">Combo</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm text-gray-400 mb-1">Giá bán tại rạp (VNĐ)</label>
                                    <input
                                        type="number"
                                        placeholder="Ví dụ: 65000"
                                        value={addFormData.price}
                                        onChange={(e) => setAddFormData({ ...addFormData, price: e.target.value })}
                                        className="w-full bg-[#151521] border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Link ảnh đại diện</label>
                                <input
                                    type="text"
                                    placeholder="Dán URL ảnh..."
                                    value={addFormData.imageUrl}
                                    onChange={(e) => setAddFormData({ ...addFormData, imageUrl: e.target.value })}
                                    disabled={addMode === 'existing'}
                                    className={`w-full bg-[#151521] border border-gray-600 rounded-lg px-4 py-2.5 mb-3 text-white focus:outline-none focus:border-blue-500 ${addMode === 'existing' ? 'opacity-70 cursor-not-allowed' : ''}`}
                                />
                                <div className="w-full h-32 bg-[#151521] border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center overflow-hidden">
                                    {addFormData.imageUrl ? (
                                        <img src={addFormData.imageUrl} alt="Preview" className="h-full object-cover" />
                                    ) : (
                                        <span className="text-gray-500 text-sm">Chưa có ảnh (Xem trước)</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                disabled={isAdding}
                                className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleConfirmAdd}
                                disabled={isAdding}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isAdding ? <><Loader2 size={16} className="animate-spin" /> Đang lưu...</> : 'Xác nhận thêm vào rạp'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Cập Nhật */}
            {isEditModalOpen && editingSnack && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#1e1e2d] w-full max-w-lg rounded-xl shadow-2xl p-6 text-gray-200 border border-gray-700 relative">
                        <h2 className="text-xl font-bold text-white mb-6">Chỉnh sửa thông tin món</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Tên món & Mô tả</label>
                                <input
                                    type="text"
                                    value={editingSnack.name || ''}
                                    onChange={(e) => setEditingSnack({ ...editingSnack, name: e.target.value })}
                                    className="w-full bg-[#151521] border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm text-gray-400 mb-1">Phân loại</label>
                                    <select
                                        value={editingSnack.category || 'popcorn'}
                                        onChange={(e) => setEditingSnack({ ...editingSnack, category: e.target.value })}
                                        className="w-full bg-[#151521] border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="popcorn">Đồ ăn nhẹ</option>
                                        <option value="drink">Nước giải khát</option>
                                        <option value="combo">Combo</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm text-gray-400 mb-1">Trạng thái</label>
                                    <select
                                        value={editingSnack.isAvailable ? 'true' : 'false'}
                                        onChange={(e) => setEditingSnack({ ...editingSnack, isAvailable: e.target.value === 'true' })}
                                        className="w-full bg-[#151521] border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="true">Đang kinh doanh</option>
                                        <option value="false">Tạm ngừng bán</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Giá bán áp dụng tại rạp (VNĐ)</label>
                                <input
                                    type="number"
                                    value={editingSnack.price || 0}
                                    onChange={(e) => setEditingSnack({ ...editingSnack, price: Number(e.target.value) })}
                                    className="w-full bg-[#151521] border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Link ảnh đại diện</label>
                                <input
                                    type="text"
                                    value={editingSnack.imageUrl || ''}
                                    onChange={(e) => setEditingSnack({ ...editingSnack, imageUrl: e.target.value })}
                                    className="w-full bg-[#151521] border border-gray-600 rounded-lg px-4 py-2.5 mb-3 text-white focus:outline-none focus:border-blue-500"
                                />
                                <div className="w-full h-32 bg-[#151521] border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center overflow-hidden">
                                    {editingSnack.imageUrl ? (
                                        <img src={editingSnack.imageUrl} alt="Preview" className="h-full object-cover" />
                                    ) : (
                                        <span className="text-gray-500 text-sm">Chưa có ảnh</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 cursor-pointer transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleSaveUpdate}
                                className="px-5 py-2.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-lg transition-colors"
                            >
                                Lưu thay đổi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Xác nhận Ẩn/Mở */}
            {isConfirmModalOpen && targetSnack && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#1e1e2d] w-full max-w-md rounded-xl shadow-2xl p-6 text-gray-200 border border-gray-700 relative">
                        <h2 className="text-xl font-bold text-white mb-4">
                            {targetSnack.isAvailable ? 'Xác nhận ẩn món' : 'Mở lại kinh doanh'}
                        </h2>
                        <p className="text-gray-300 mb-6 text-sm leading-relaxed">
                            Bạn có chắc chắn muốn {targetSnack.isAvailable ? 'ẩn' : 'mở bán lại'} món <strong className="text-white">{targetSnack.name}</strong> khỏi thực đơn rạp <strong className="text-white">{cinemas.find(c => c.id === selectedCinemaId)?.name || 'này'}</strong>?
                            {targetSnack.isAvailable && (
                                <span className="block mt-2 text-orange-400">
                                    * Món này sẽ hoàn toàn không được hiển thị lên giao diện chọn bắp nước của khách hàng khi mua vé.
                                </span>
                            )}
                        </p>
                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                onClick={() => setIsConfirmModalOpen(false)}
                                className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 cursor-pointer transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleConfirmToggle}
                                className={`px-5 py-2.5 rounded-lg text-sm font-medium text-white cursor-pointer shadow-lg transition-colors ${targetSnack.isAvailable ? 'bg-orange-600 hover:bg-orange-500' : 'bg-green-600 hover:bg-green-500'
                                    }`}
                            >
                                Đồng ý
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSnacks;