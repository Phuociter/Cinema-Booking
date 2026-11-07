import React, { useState, useEffect } from 'react';

const AdminSnacks = () => {
    const [cinemas, setCinemas] = useState([]);
    const [selectedCinemaId, setSelectedCinemaId] = useState('');

    const [cinemaSnacks, setCinemaSnacks] = useState([]);
    const [masterSnacks, setMasterSnacks] = useState([]);

    const [loading, setLoading] = useState(false);

    const [newSnackId, setNewSnackId] = useState('');
    const [newSnackPrice, setNewSnackPrice] = useState('');

    const API_BASE = 'http://localhost:5000/api';

    useEffect(() => {
        fetchCinemas();
        fetchMasterSnacks();
    }, []);

    useEffect(() => {
        if (selectedCinemaId) {
            fetchCinemaSnacks(selectedCinemaId);
        } else {
            setCinemaSnacks([]);
        }
    }, [selectedCinemaId]);

    const fetchCinemas = async () => {
        try {
            const res = await fetch(`${API_BASE}/cinemas`);
            if (res.ok) {
                const data = await res.json();
                setCinemas(data);
                if (data.length > 0) setSelectedCinemaId(data[0].id);
            }
        } catch (error) {
            console.error('Lỗi khi tải danh sách rạp:', error);
        }
    };

    const fetchMasterSnacks = async () => {
        try {
            const res = await fetch(`${API_BASE}/snacks`);
            if (res.ok) setMasterSnacks(await res.json());
        } catch (error) {
            console.error('Lỗi tải Master Snacks:', error);
        }
    };

    const fetchCinemaSnacks = async (cinemaId) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/cinemas/${cinemaId}/snacks?onlyAvailable=false`);
            if (res.ok) setCinemaSnacks(await res.json());
        } catch (error) {
            console.error('Lỗi tải Cinema Snacks:', error);
        }
        setLoading(false);
    };

    const handleUpdateSnack = async (snackId, currentPrice, currentIsAvailable, field, newValue) => {
        const updatedPrice = field === 'price' ? parseFloat(newValue) : currentPrice;
        const updatedStatus = field === 'status' ? newValue : currentIsAvailable;

        try {
            const res = await fetch(`${API_BASE}/cinemas/${selectedCinemaId}/snacks/${snackId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ price: updatedPrice, isAvailable: updatedStatus })
            });

            if (res.ok) {
                setCinemaSnacks(prev => prev.map(s =>
                    s.snackId === snackId ? { ...s, price: updatedPrice, isAvailable: updatedStatus } : s
                ));
            } else {
                alert("Cập nhật thất bại!");
            }
        } catch (error) {
            console.error('Lỗi cập nhật:', error);
        }
    };

    const handleAddSnackToCinema = async () => {
        if (!newSnackId || !newSnackPrice) return alert('Vui lòng chọn món và nhập giá!');

        try {
            const res = await fetch(`${API_BASE}/cinemas/${selectedCinemaId}/snacks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ snackId: newSnackId, price: parseFloat(newSnackPrice) })
            });

            if (res.ok) {
                fetchCinemaSnacks(selectedCinemaId);
                setNewSnackId('');
                setNewSnackPrice('');
            } else {
                const error = await res.json();
                alert(error.message || "Thêm món thất bại!");
            }
        } catch (error) {
            console.error('Lỗi thêm món:', error);
        }
    };

    const handleRemoveSnack = async (snackId) => {
        if (!window.confirm("Bạn có chắc muốn gỡ món này khỏi thực đơn của rạp?")) return;

        try {
            const res = await fetch(`${API_BASE}/cinemas/${selectedCinemaId}/snacks/${snackId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setCinemaSnacks(prev => prev.filter(s => s.snackId !== snackId));
            }
        } catch (error) {
            console.error('Lỗi xóa món:', error);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-3xl font-bold mb-2 text-red-500">Quản Lý Menu Bắp Nước Theo Rạp</h1>
                <p className="text-slate-400 mb-8">Cấu hình danh mục và giá bắp nước riêng biệt tại từng rạp.</p>

                <div className="bg-slate-800 p-6 rounded-lg mb-8 shadow-lg flex items-end gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-2 text-slate-300">Chọn Cụm Rạp:</label>
                        <select
                            className="w-full bg-slate-700 border border-slate-600 text-white rounded px-4 py-2 focus:outline-none focus:border-red-500"
                            value={selectedCinemaId}
                            onChange={(e) => setSelectedCinemaId(e.target.value)}
                        >
                            <option value="" disabled>-- Vui lòng chọn rạp --</option>
                            {cinemas.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {selectedCinemaId && (
                    <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden mb-8">
                        <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-white">Thực Đơn Của Rạp</h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-900/50 text-slate-300 text-sm">
                                        <th className="p-4 font-medium">Hình ảnh</th>
                                        <th className="p-4 font-medium">Tên món</th>
                                        <th className="p-4 font-medium">Giá bán tại rạp (VNĐ)</th>
                                        <th className="p-4 font-medium text-center">Trạng thái</th>
                                        <th className="p-4 font-medium text-center">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {loading && (
                                        <tr><td colSpan="5" className="p-8 text-center text-slate-400">Đang tải dữ liệu...</td></tr>
                                    )}

                                    {!loading && cinemaSnacks.length === 0 && (
                                        <tr><td colSpan="5" className="p-8 text-center text-slate-400">Rạp này chưa có món nào trong thực đơn.</td></tr>
                                    )}

                                    {!loading && cinemaSnacks.length > 0 && cinemaSnacks.map(snack => (
                                        <tr key={snack.snackId} className="hover:bg-slate-700/50 transition-colors">
                                            <td className="p-4">
                                                <img src={snack.imageUrl || 'https://via.placeholder.com/50'} alt={snack.name} className="w-12 h-12 rounded object-cover" />
                                            </td>
                                            <td className="p-4 font-medium">{snack.name}</td>
                                            <td className="p-4">
                                                <input
                                                    type="number"
                                                    className="bg-slate-900 border border-slate-600 rounded px-3 py-1 w-32 focus:outline-none focus:border-red-500"
                                                    defaultValue={snack.price}
                                                    onBlur={(e) => handleUpdateSnack(snack.snackId, snack.price, snack.isAvailable, 'price', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => handleUpdateSnack(snack.snackId, snack.price, snack.isAvailable, 'status', !snack.isAvailable)}
                                                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${snack.isAvailable ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}
                                                >
                                                    {snack.isAvailable ? 'Còn hàng' : 'Tạm hết'}
                                                </button>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => handleRemoveSnack(snack.snackId)}
                                                    className="text-slate-400 hover:text-red-400 transition-colors"
                                                    title="Gỡ khỏi rạp"
                                                >
                                                    🗑️ Xóa
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {selectedCinemaId && (
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
                        <h3 className="text-lg font-semibold text-white mb-4">Thêm Món Mới Vào Rạp</h3>
                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-medium mb-2 text-slate-300">Chọn món từ danh mục tổng:</label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-600 text-white rounded px-4 py-2 focus:outline-none focus:border-red-500"
                                    value={newSnackId}
                                    onChange={(e) => setNewSnackId(e.target.value)}
                                >
                                    <option value="">-- Chọn bắp nước --</option>
                                    {masterSnacks.filter(ms => !cinemaSnacks.some(cs => cs.snackId === ms.id)).map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-slate-300">Giá bán (VNĐ):</label>
                                <input
                                    type="number"
                                    className="w-40 bg-slate-900 border border-slate-600 rounded px-4 py-2 focus:outline-none focus:border-red-500"
                                    placeholder="Ví dụ: 65000"
                                    value={newSnackPrice}
                                    onChange={(e) => setNewSnackPrice(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={handleAddSnackToCinema}
                                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded transition-colors"
                            >
                                + Thêm Vào Rạp
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminSnacks;