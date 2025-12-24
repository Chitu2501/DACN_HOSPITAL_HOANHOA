'use client';

import { useState, useEffect } from 'react';
import { PatientLayout } from '@/components/Layout/PatientLayout';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useStaticQuery } from '@/lib/hooks/useOptimizedQuery';
import { patientProfileApi, patientInsuranceApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Edit2, 
  Save, 
  X, 
  Heart,
  Shield,
  UserCircle,
  Home,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader,
  Stethoscope,
  Activity,
  FileText,
  CreditCard,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  Trash2,
  Sparkles
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { vietnamAddresses, type Province, type District, type Ward, getProvinceByCode, getDistrictByCode, getWardByCode } from '@/lib/data/vietnam-addresses';

export default function PatientProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingInsurance, setIsEditingInsurance] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    address: '',
    addressDetail: '', // Địa chỉ chi tiết (số nhà, tên đường)
    province: '',
    district: '',
    ward: '',
    originalAddress: '', // Lưu địa chỉ gốc để giữ lại nếu không chọn mới
    dateOfBirth: '',
    bloodType: '',
    allergies: '',
    medicalHistory: '',
    insuranceNumber: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    }
  });
  const [insuranceData, setInsuranceData] = useState({
    soThe: '',
    maNoiDangKyKCB: '',
    tyLeChiTra: '',
    tyLeDongChiTra: '',
    hieuLucTu: '',
    hieuLucDen: '',
    trangThai: '',
    maBenhNhan: '',
    anhMatTruoc: null as string | null,
    anhMatSau: null as string | null
  });

  // State for image uploads
  const [matTruocFile, setMatTruocFile] = useState<File | null>(null);
  const [matSauFile, setMatSauFile] = useState<File | null>(null);
  const [matTruocPreview, setMatTruocPreview] = useState<string | null>(null);
  const [matSauPreview, setMatSauPreview] = useState<string | null>(null);


  // Mutation for uploading BHYT images
  const uploadImagesMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await patientInsuranceApi.uploadImages(formData);
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Upload ảnh BHYT thất bại');
      }
      return response.data;
    },
    onSuccess: async (data) => {
      console.log('✅ Images uploaded successfully:', data);
      const uploadedData = data?.data;
      
      if (uploadedData) {
        // Update local state with new image URLs
        setInsuranceData(prev => ({
          ...prev,
          anhMatTruoc: uploadedData.anhMatTruoc || prev.anhMatTruoc,
          anhMatSau: uploadedData.anhMatSau || prev.anhMatSau
        }));
        
        // Update query cache
        queryClient.setQueryData(['patient-insurance'], (old: any) => ({
          ...old,
          anhMatTruoc: uploadedData.anhMatTruoc || old?.anhMatTruoc,
          anhMatSau: uploadedData.anhMatSau || old?.anhMatSau
        }));
        
        // Clear previews and files
        setMatTruocFile(null);
        setMatSauFile(null);
        setMatTruocPreview(null);
        setMatSauPreview(null);
        
        toast.success('Upload ảnh BHYT thành công');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Upload ảnh BHYT thất bại');
    }
  });

  // Mutation for updating insurance
  const updateInsuranceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await patientInsuranceApi.update(data);
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Cập nhật thông tin BHYT thất bại');
      }
      return response.data;
    },
    onSuccess: async (data) => {
      console.log('✅ Insurance mutation success, received data:', data);
      
      // Use data from API response
      const insuranceData = data?.data;
      
      if (insuranceData) {
        // Update local state with returned data
        setInsuranceData({
          soThe: insuranceData.soThe || '',
          maNoiDangKyKCB: insuranceData.maNoiDangKyKCB || '',
          tyLeChiTra: insuranceData.tyLeChiTra?.toString() || '',
          tyLeDongChiTra: insuranceData.tyLeDongChiTra?.toString() || '',
          hieuLucTu: insuranceData.hieuLucTu || '',
          hieuLucDen: insuranceData.hieuLucDen || '',
          trangThai: insuranceData.trangThai || '',
          maBenhNhan: insuranceData.maBenhNhan || '',
          anhMatTruoc: insuranceData.anhMatTruoc || null,
          anhMatSau: insuranceData.anhMatSau || null
        });
        
        // Update query cache directly with new data
        queryClient.setQueryData(['patient-insurance'], insuranceData);
        
        // Mark that we have data now
        sessionStorage.setItem('insurance-has-data', 'true');
        
        // Close edit mode after successful save
        setIsEditingInsurance(false);
        toast.success('Cập nhật thông tin BHYT thành công');
      } else {
        // If no data in response, invalidate and refetch
        console.warn('No data in response, refetching...');
        await queryClient.invalidateQueries({ queryKey: ['patient-insurance'] });
        const refetchResult = await queryClient.refetchQueries({ 
          queryKey: ['patient-insurance'],
          type: 'active'
        });
        
        // Check if refetch was successful and has data
        if (Array.isArray(refetchResult) && refetchResult.length > 0) {
          const firstResult = refetchResult[0];
          if (firstResult && 'data' in firstResult && firstResult.data) {
            const refetchedData = firstResult.data as any;
            setInsuranceData({
              soThe: refetchedData.soThe || '',
              maNoiDangKyKCB: refetchedData.maNoiDangKyKCB || '',
              tyLeChiTra: refetchedData.tyLeChiTra?.toString() || '',
              tyLeDongChiTra: refetchedData.tyLeDongChiTra?.toString() || '',
              hieuLucTu: refetchedData.hieuLucTu || '',
              hieuLucDen: refetchedData.hieuLucDen || '',
              trangThai: refetchedData.trangThai || '',
              maBenhNhan: refetchedData.maBenhNhan || '',
              anhMatTruoc: refetchedData.anhMatTruoc || null,
              anhMatSau: refetchedData.anhMatSau || null
            });
            queryClient.setQueryData(['patient-insurance'], refetchedData);
            sessionStorage.setItem('insurance-has-data', 'true');
            setIsEditingInsurance(false);
            toast.success('Cập nhật thông tin BHYT thành công');
            return;
          }
        }
        
        // If refetch failed, still show success but keep edit mode
        toast.error('Lưu thành công nhưng không thể tải lại dữ liệu. Vui lòng tải lại trang.');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Cập nhật thông tin BHYT thất bại');
    }
  });

  const handleInsuranceSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    // Validate required fields
    if (!insuranceData.soThe) {
      toast.error('Vui lòng nhập số thẻ BHYT');
      return;
    }
    
    // Prepare data for API (convert empty strings to null for optional fields)
    const submitData = {
      soThe: insuranceData.soThe,
      maNoiDangKyKCB: insuranceData.maNoiDangKyKCB || null,
      tyLeChiTra: insuranceData.tyLeChiTra ? parseFloat(insuranceData.tyLeChiTra) : null,
      tyLeDongChiTra: insuranceData.tyLeDongChiTra ? parseFloat(insuranceData.tyLeDongChiTra) : null,
      hieuLucTu: insuranceData.hieuLucTu || null,
      hieuLucDen: insuranceData.hieuLucDen || null,
      trangThai: insuranceData.trangThai || null
    };
    
    updateInsuranceMutation.mutate(submitData);
  };

  const handleInsuranceCancel = () => {
    if (insuranceResponse) {
      setInsuranceData({
        soThe: insuranceResponse.soThe || '',
        maNoiDangKyKCB: insuranceResponse.maNoiDangKyKCB || '',
        tyLeChiTra: insuranceResponse.tyLeChiTra?.toString() || '',
        tyLeDongChiTra: insuranceResponse.tyLeDongChiTra?.toString() || '',
        hieuLucTu: insuranceResponse.hieuLucTu || '',
        hieuLucDen: insuranceResponse.hieuLucDen || '',
        trangThai: insuranceResponse.trangThai || '',
        maBenhNhan: insuranceResponse.maBenhNhan || '',
        anhMatTruoc: insuranceResponse.anhMatTruoc || null,
        anhMatSau: insuranceResponse.anhMatSau || null
      });
    }
    setIsEditingInsurance(false);
  };

  const handleInsuranceInputChange = (field: string, value: any) => {
    setInsuranceData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle image file selection
  const handleImageSelect = (side: 'truoc' | 'sau', file: File | null) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh hợp lệ');
      return;
    }
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước file không được vượt quá 5MB');
      return;
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (side === 'truoc') {
        setMatTruocFile(file);
        setMatTruocPreview(reader.result as string);
      } else {
        setMatSauFile(file);
        setMatSauPreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle image upload
  const handleUploadImages = async () => {
    if (!matTruocFile && !matSauFile) {
      toast.error('Vui lòng chọn ít nhất một ảnh để upload');
      return;
    }

    const formData = new FormData();
    if (matTruocFile) {
      formData.append('mat_truoc', matTruocFile);
    }
    if (matSauFile) {
      formData.append('mat_sau', matSauFile);
    }

    uploadImagesMutation.mutate(formData);
  };

  // Remove image preview
  const handleRemoveImage = (side: 'truoc' | 'sau') => {
    if (side === 'truoc') {
      setMatTruocFile(null);
      setMatTruocPreview(null);
    } else {
      setMatSauFile(null);
      setMatSauPreview(null);
    }
  };

  const queryClient = useQueryClient();

  // Fetch profile với static query (data ít thay đổi)
  const { data: profileData, isLoading, error: profileError } = useStaticQuery(
    ['patient-profile'],
    async () => {
      const response = await patientProfileApi.get();
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Không thể tải thông tin profile');
      }
      return response.data;
    }
  );

  // Fetch BHYT information
  const { data: insuranceResponse, isLoading: isLoadingInsurance, error: insuranceError } = useStaticQuery(
    ['patient-insurance'],
    async () => {
      try {
        const response = await patientInsuranceApi.get();
        console.log('🔍 Insurance API response:', response);
        if (!response.data?.success) {
          console.log('⚠️ Insurance API returned unsuccessful:', response.data);
          return null;
        }
        console.log('✅ Insurance data received:', response.data.data);
        return response.data.data;
      } catch (error) {
        console.error('❌ Error fetching insurance:', error);
        return null;
      }
    }
  );

  const profile = profileData?.data;
  const insurance = insuranceResponse;

  // Debug logging
  useEffect(() => {
    console.log('🔍 Insurance state:', {
      insuranceResponse,
      insurance,
      isLoadingInsurance,
      insuranceError,
      hasData: !!insurance,
      soThe: insurance?.soThe,
      isEditingInsurance,
      insuranceData: insuranceData
    });
  }, [insuranceResponse, insurance, isLoadingInsurance, insuranceError, isEditingInsurance, insuranceData]);

  // Update insurance data when response loads
  useEffect(() => {
    console.log('🔄 Insurance useEffect triggered:', {
      insuranceResponse,
      isEditingInsurance,
      isLoadingInsurance,
      hasInsuranceData: !!insuranceResponse
    });
    
    if (insuranceResponse) {
      console.log('✅ Updating insurance data from response:', insuranceResponse);
      // Always update form data with fetched insurance data (for both view and edit mode)
      setInsuranceData({
        soThe: insuranceResponse.soThe || '',
        maNoiDangKyKCB: insuranceResponse.maNoiDangKyKCB || '',
        tyLeChiTra: insuranceResponse.tyLeChiTra?.toString() || '',
        tyLeDongChiTra: insuranceResponse.tyLeDongChiTra?.toString() || '',
        hieuLucTu: insuranceResponse.hieuLucTu || '',
        hieuLucDen: insuranceResponse.hieuLucDen || '',
        trangThai: insuranceResponse.trangThai || '',
        maBenhNhan: insuranceResponse.maBenhNhan || '',
        anhMatTruoc: insuranceResponse.anhMatTruoc || null,
        anhMatSau: insuranceResponse.anhMatSau || null
      });
      // Mark that we have data
      sessionStorage.setItem('insurance-has-data', 'true');
      // If we have data, ensure we're in view mode (unless user is actively editing)
      // Only set to false if it was previously true due to auto-enable
      const wasAutoEnabled = sessionStorage.getItem('insurance-auto-enabled');
      if (wasAutoEnabled === 'true') {
        setIsEditingInsurance(false);
        sessionStorage.removeItem('insurance-auto-enabled');
      }
    } else if (!isLoadingInsurance) {
      console.log('⚠️ No insurance data, checking if should enable edit mode');
      // Auto-enable edit mode if no insurance data exists (only on initial load)
      // Check if this is the first time loading (not after a successful save)
      const hasDataBefore = sessionStorage.getItem('insurance-has-data');
      if (!hasDataBefore) {
        console.log('📝 Enabling edit mode - no data exists');
        setIsEditingInsurance(true);
        sessionStorage.setItem('insurance-auto-enabled', 'true');
        setInsuranceData({
          soThe: '',
          maNoiDangKyKCB: '',
          tyLeChiTra: '',
          tyLeDongChiTra: '',
          hieuLucTu: '',
          hieuLucDen: '',
          trangThai: '',
          maBenhNhan: '',
          anhMatTruoc: null,
          anhMatSau: null
        });
      } else {
        console.log('ℹ️ Data was saved before, keeping view mode');
        setIsEditingInsurance(false);
      }
    }
  }, [insuranceResponse, isLoadingInsurance]);

  // Parse address from profile - try to extract province, district, ward from address string
  const parseAddress = (address: string) => {
    if (!address) return { province: '', district: '', ward: '', addressDetail: '', originalAddress: address };
    
    // Try to find province, district, ward in the address string
    let foundProvince = '';
    let foundDistrict = '';
    let foundWard = '';
    let addressDetail = address;
    
    // Split address by comma and trim
    const parts = address.split(',').map(p => p.trim()).filter(p => p);
    
    // Try to match province first (check from end of address)
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      const province = vietnamAddresses.find(p => 
        p.name === part || 
        part.includes(p.name) || 
        p.name.includes(part)
      );
      if (province) {
        foundProvince = province.code;
        // Remove province from address detail
        addressDetail = parts.slice(0, i).join(', ');
        break;
      }
    }
    
    // If province found, try to find district
    if (foundProvince) {
      const provinceData = getProvinceByCode(foundProvince);
      if (provinceData) {
        const remainingParts = addressDetail.split(',').map(p => p.trim()).filter(p => p);
        for (let i = remainingParts.length - 1; i >= 0; i--) {
          const part = remainingParts[i];
          const district = provinceData.districts.find(d => 
            d.name === part || 
            part.includes(d.name) || 
            d.name.includes(part)
          );
          if (district) {
            foundDistrict = district.code;
            // Remove district from address detail
            addressDetail = remainingParts.slice(0, i).join(', ');
            break;
          }
        }
      }
    }
    
    // If district found, try to find ward
    if (foundDistrict) {
      const districtData = getDistrictByCode(foundProvince, foundDistrict);
      if (districtData) {
        const remainingParts = addressDetail.split(',').map(p => p.trim()).filter(p => p);
        for (let i = remainingParts.length - 1; i >= 0; i--) {
          const part = remainingParts[i];
          const ward = districtData.wards.find(w => 
            w.name === part || 
            part.includes(w.name) || 
            w.name.includes(part)
          );
          if (ward) {
            foundWard = ward.code;
            // Remove ward from address detail
            addressDetail = remainingParts.slice(0, i).join(', ');
            break;
          }
        }
      }
    }
    
    // If we couldn't parse, keep the original address in addressDetail
    if (!foundProvince && !foundDistrict && !foundWard) {
      addressDetail = address;
    }
    
    return {
      province: foundProvince,
      district: foundDistrict,
      ward: foundWard,
      addressDetail: addressDetail || '',
      originalAddress: address
    };
  };

  // Update form data when profile loads
  useEffect(() => {
    if (profile && !isEditing) {
      const parsedAddress = parseAddress(profile.address || '');
      setFormData({
        email: profile.email || '',
        phone: profile.phone || '',
        address: profile.address || '',
        addressDetail: parsedAddress.addressDetail,
        province: parsedAddress.province,
        district: parsedAddress.district,
        ward: parsedAddress.ward,
        originalAddress: parsedAddress.originalAddress,
        dateOfBirth: profile.dateOfBirth || '',
        bloodType: profile.bloodType || '',
        allergies: profile.allergies || '',
        medicalHistory: profile.medicalHistory || '',
        insuranceNumber: profile.insuranceNumber || '',
        emergencyContact: profile.emergencyContact || {
          name: '',
          phone: '',
          relationship: ''
        }
      });
    }
  }, [profile, isEditing]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await patientProfileApi.update(data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient-profile'] });
      toast.success(data.message || 'Cập nhật thông tin thành công!');
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật thông tin');
    }
  });

  const handleEdit = () => {
    if (profile) {
      const parsedAddress = parseAddress(profile.address || '');
      setFormData({
        email: profile.email || '',
        phone: profile.phone || '',
        address: profile.address || '',
        addressDetail: parsedAddress.addressDetail,
        province: parsedAddress.province,
        district: parsedAddress.district,
        ward: parsedAddress.ward,
        originalAddress: parsedAddress.originalAddress,
        dateOfBirth: profile.dateOfBirth || '',
        bloodType: profile.bloodType || '',
        allergies: profile.allergies || '',
        medicalHistory: profile.medicalHistory || '',
        insuranceNumber: profile.insuranceNumber || '',
        emergencyContact: profile.emergencyContact || {
          name: '',
          phone: '',
          relationship: ''
        }
      });
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (profile) {
      const parsedAddress = parseAddress(profile.address || '');
      setFormData({
        email: profile.email || '',
        phone: profile.phone || '',
        address: profile.address || '',
        addressDetail: parsedAddress.addressDetail,
        province: parsedAddress.province,
        district: parsedAddress.district,
        ward: parsedAddress.ward,
        originalAddress: parsedAddress.originalAddress,
        dateOfBirth: profile.dateOfBirth || '',
        bloodType: profile.bloodType || '',
        allergies: profile.allergies || '',
        medicalHistory: profile.medicalHistory || '',
        insuranceNumber: profile.insuranceNumber || '',
        emergencyContact: profile.emergencyContact || {
          name: '',
          phone: '',
          relationship: ''
        }
      });
    }
    setIsEditing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build full address string
    // If user selected new province/district/ward, use them
    // Otherwise, keep the original address
    let fullAddress = '';
    
    if (formData.province && formData.district && formData.ward) {
      // User selected new address - build from selections
      const selectedProvince = vietnamAddresses.find(p => p.code === formData.province);
      const selectedDistrict = selectedProvince?.districts.find(d => d.code === formData.district);
      const selectedWard = selectedDistrict?.wards.find(w => w.code === formData.ward);
      
      fullAddress = formData.addressDetail || '';
      if (selectedWard) fullAddress = `${fullAddress ? fullAddress + ', ' : ''}${selectedWard.name}`;
      if (selectedDistrict) fullAddress = `${fullAddress ? fullAddress + ', ' : ''}${selectedDistrict.name}`;
      if (selectedProvince) fullAddress = `${fullAddress ? fullAddress + ', ' : ''}${selectedProvince.name}`;
    } else {
      // User didn't select new address - keep original address
      // If addressDetail was modified, use it with original structure
      if (formData.addressDetail && formData.addressDetail !== formData.originalAddress) {
        // User modified address detail but didn't select new province/district/ward
        // Keep the original address structure but update detail part if possible
        fullAddress = formData.originalAddress || formData.address || formData.addressDetail;
      } else {
        // Keep original address completely
        fullAddress = formData.originalAddress || formData.address || '';
      }
    }
    
    const submitData = {
      ...formData,
      address: fullAddress || formData.address
    };
    
    // Remove originalAddress from submit data (it's only for internal use)
    delete (submitData as any).originalAddress;
    
    updateMutation.mutate(submitData);
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('emergencyContact.')) {
      const subField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        emergencyContact: {
          ...prev.emergencyContact,
          [subField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case 'male': return 'Nam';
      case 'female': return 'Nữ';
      case 'other': return 'Khác';
      default: return gender;
    }
  };

  const getGenderIcon = (gender: string) => {
    switch (gender) {
      case 'male': return '♂';
      case 'female': return '♀';
      default: return '⚧';
    }
  };

  if (isLoading) {
    return (
      <PatientLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 text-sm">Đang tải thông tin...</p>
          </div>
        </div>
      </PatientLayout>
    );
  }

  if (profileError) {
    return (
      <PatientLayout>
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-20 px-6">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Có lỗi xảy ra</h2>
            <p className="text-slate-400 mb-6">
              {(profileError as any)?.response?.data?.message || (profileError as any)?.message || 'Không thể tải thông tin profile'}
            </p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['patient-profile'] })}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-500 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/25"
            >
              Thử lại
            </button>
          </div>
        </div>
      </PatientLayout>
    );
  }

  if (!profile) {
    return (
      <PatientLayout>
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-20 px-6">
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Không tìm thấy thông tin</h2>
            <p className="text-slate-400 mb-6">
              Hệ thống đang tạo hồ sơ bệnh nhân cho bạn. Vui lòng thử lại sau vài giây.
            </p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['patient-profile'] })}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-500 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/25"
            >
              Tải lại
            </button>
          </div>
        </div>
      </PatientLayout>
    );
  }

  return (
    <PatientLayout>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                <UserCircle className="w-7 h-7 text-white" />
              </div>
              Hồ sơ bệnh nhân
            </h1>
            <p className="text-slate-600 mt-1">Quản lý thông tin cá nhân và y tế của bạn</p>
          </div>
          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-teal-500 hover:to-emerald-500 transition-all flex items-center gap-2 shadow-lg shadow-teal-500/30"
            >
              <Edit2 className="w-5 h-5" />
              Chỉnh sửa
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="px-6 py-3 bg-white text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all flex items-center gap-2 border-2 border-slate-200"
              >
                <X className="w-5 h-5" />
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={updateMutation.isPending}
                className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-teal-500 hover:to-emerald-500 transition-all flex items-center gap-2 shadow-lg shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Lưu thay đổi
              </button>
            </div>
          )}
        </div>

        {/* Patient Card Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-600 p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-28 h-28 rounded-2xl bg-white/20 backdrop-blur-sm border-4 border-white/30 flex items-center justify-center shadow-xl">
                  <UserCircle className="w-16 h-16 text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-full border-4 border-teal-700 flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
              </div>
              
              {/* Patient Info */}
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-white mb-3 flex items-center gap-3">
                  {profile.fullName || 'Bệnh nhân'}
                  <span className="text-2xl opacity-90">{getGenderIcon(profile.gender)}</span>
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-teal-100 mb-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{profile.email}</span>
                  </div>
                  {profile.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-sm font-semibold text-white border border-white/30">
                    Bệnh nhân
                  </span>
                  {profile.bloodType && (
                    <span className="px-4 py-1.5 bg-red-500/30 backdrop-blur-sm rounded-lg text-sm font-semibold text-white border border-red-400/30 flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      Nhóm máu: {profile.bloodType}
                    </span>
                  )}
                  {profile.insuranceNumber && (
                    <span className="px-4 py-1.5 bg-blue-500/30 backdrop-blur-sm rounded-lg text-sm font-semibold text-white border border-blue-400/30 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Có BHYT
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="p-6 bg-slate-50 border-b border-slate-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Ngày sinh</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {profile.dateOfBirth ? formatDate(profile.dateOfBirth) : 'Chưa cập nhật'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200">
                <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Nhóm máu</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {profile.bloodType || 'Chưa cập nhật'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200">
                <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Dị ứng</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {profile.allergies ? 'Có' : 'Không có'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200">
                <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">BHYT</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {profile.insuranceNumber ? 'Đã đăng ký' : 'Chưa đăng ký'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Thông tin cá nhân</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {/* Full Name - Read Only */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Họ và tên
                    </label>
                    <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium">
                      {profile.fullName}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Gender - Read Only */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Giới tính
                      </label>
                      <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium">
                        {getGenderLabel(profile.gender)}
                      </div>
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        Ngày sinh
                      </label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                          className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                        />
                      ) : (
                        <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                          {profile.dateOfBirth ? formatDate(profile.dateOfBirth) : 'Chưa cập nhật'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Blood Type */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      Nhóm máu
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.bloodType}
                        onChange={(e) => handleInputChange('bloodType', e.target.value)}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                      >
                        <option value="">Chọn nhóm máu</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    ) : (
                      <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                        {profile.bloodType || 'Chưa cập nhật'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Thông tin liên hệ</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-500" />
                      Email
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                        required
                      />
                    ) : (
                      <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                        {profile.email}
                      </div>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-500" />
                      Số điện thoại
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                        required
                      />
                    ) : (
                      <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                        {profile.phone || 'Chưa cập nhật'}
                      </div>
                    )}
                  </div>

                {/* Address Selector */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    Địa chỉ
                  </label>
                  {isEditing ? (
                    <AddressSelector
                      province={formData.province}
                      district={formData.district}
                      ward={formData.ward}
                      addressDetail={formData.addressDetail}
                      onProvinceChange={(value) => {
                        handleInputChange('province', value);
                        handleInputChange('district', '');
                        handleInputChange('ward', '');
                      }}
                      onDistrictChange={(value) => {
                        handleInputChange('district', value);
                        handleInputChange('ward', '');
                      }}
                      onWardChange={(value) => handleInputChange('ward', value)}
                      onAddressDetailChange={(value) => handleInputChange('addressDetail', value)}
                    />
                  ) : (
                    <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 min-h-[80px]">
                      {profile.address || 'Chưa cập nhật'}
                    </div>
                  )}
                </div>
                </div>
              </div>
            </div>
          </div>

          {/* Medical Information Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Stethoscope className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Thông tin y tế</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {/* Allergies */}

                {/* Allergies */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Dị ứng
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.allergies}
                      onChange={(e) => handleInputChange('allergies', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                      placeholder="VD: Penicillin, Thuốc giảm đau..."
                    />
                  ) : (
                    <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                      {profile.allergies || 'Không có'}
                    </div>
                  )}
                </div>

                {/* Medical History */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    Tiền sử bệnh
                  </label>
                  {isEditing ? (
                    <textarea
                      value={formData.medicalHistory}
                      onChange={(e) => handleInputChange('medicalHistory', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all resize-none"
                      placeholder="Nhập tiền sử bệnh (nếu có)"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 min-h-[100px] whitespace-pre-wrap">
                      {profile.medicalHistory || 'Không có'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* BHYT Information Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Thông tin Bảo hiểm Y tế (BHYT)</h2>
                </div>
                {!isEditingInsurance && insurance ? (
                  <button
                    onClick={() => {
                      // Populate form data when entering edit mode
                      if (insurance) {
                        setInsuranceData({
                          soThe: insurance.soThe || '',
                          maNoiDangKyKCB: insurance.maNoiDangKyKCB || '',
                          tyLeChiTra: insurance.tyLeChiTra?.toString() || '',
                          tyLeDongChiTra: insurance.tyLeDongChiTra?.toString() || '',
                          hieuLucTu: insurance.hieuLucTu || '',
                          hieuLucDen: insurance.hieuLucDen || '',
                          trangThai: insurance.trangThai || '',
                          maBenhNhan: insurance.maBenhNhan || '',
                          anhMatTruoc: insurance.anhMatTruoc || null,
                          anhMatSau: insurance.anhMatSau || null
                        });
                      }
                      setIsEditingInsurance(true);
                    }}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-white font-semibold flex items-center gap-2 transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                    Chỉnh sửa
                  </button>
                ) : !insurance && !isEditingInsurance ? (
                  <button
                    onClick={() => {
                      setInsuranceData({
                        soThe: '',
                        maNoiDangKyKCB: '',
                        tyLeChiTra: '',
                        tyLeDongChiTra: '',
                        hieuLucTu: '',
                        hieuLucDen: '',
                        trangThai: '',
                        maBenhNhan: '',
                        anhMatTruoc: null,
                        anhMatSau: null
                      });
                      setIsEditingInsurance(true);
                    }}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-white font-semibold flex items-center gap-2 transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                    Thêm thông tin
                  </button>
                ) : null}
              </div>
            </div>
            <div className="p-6">
              {isLoadingInsurance ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-6 h-6 animate-spin text-teal-600" />
                </div>
              ) : insuranceError ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-300" />
                  <p className="text-slate-600 mb-4">Lỗi khi tải thông tin BHYT</p>
                  <button
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ['patient-insurance'] });
                    }}
                    className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-all"
                  >
                    Thử lại
                  </button>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Số thẻ BHYT */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-slate-500" />
                        Số thẻ BHYT <span className="text-red-500">*</span>
                      </label>
                      {isEditingInsurance || !insurance ? (
                        <input
                          type="text"
                          value={insuranceData.soThe || ''}
                          onChange={(e) => handleInsuranceInputChange('soThe', e.target.value)}
                          className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                          placeholder="Nhập số thẻ BHYT"
                          required
                        />
                      ) : (
                        <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono">
                          {insurance?.soThe || insuranceData.soThe || 'Chưa cập nhật'}
                        </div>
                      )}
                    </div>

                    {/* Mã nơi đăng ký KCB */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <Home className="w-4 h-4 text-slate-500" />
                        Mã nơi đăng ký KCB
                      </label>
                      {isEditingInsurance || !insurance ? (
                        <input
                          type="text"
                          value={insuranceData.maNoiDangKyKCB}
                          onChange={(e) => handleInsuranceInputChange('maNoiDangKyKCB', e.target.value)}
                          className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                          placeholder="Nhập mã nơi đăng ký KCB"
                        />
                      ) : (
                        <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                          {insurance && insurance.maNoiDangKyKCB ? insurance.maNoiDangKyKCB : 'Chưa cập nhật'}
                        </div>
                      )}
                    </div>

                    {/* Tỷ lệ chi trả */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-slate-500" />
                        Tỷ lệ chi trả (%)
                      </label>
                      {isEditingInsurance || !insurance ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={insuranceData.tyLeChiTra}
                          onChange={(e) => handleInsuranceInputChange('tyLeChiTra', e.target.value)}
                          className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                          placeholder="VD: 80.00"
                        />
                      ) : (
                        <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                          {insurance && insurance.tyLeChiTra ? `${insurance.tyLeChiTra}%` : 'Chưa cập nhật'}
                        </div>
                      )}
                    </div>

                    {/* Tỷ lệ đồng chi trả */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-slate-500" />
                        Tỷ lệ đồng chi trả (%)
                      </label>
                      {isEditingInsurance || !insurance ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={insuranceData.tyLeDongChiTra}
                          onChange={(e) => handleInsuranceInputChange('tyLeDongChiTra', e.target.value)}
                          className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                          placeholder="VD: 20.00"
                        />
                      ) : (
                        <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                          {insurance && insurance.tyLeDongChiTra ? `${insurance.tyLeDongChiTra}%` : 'Chưa cập nhật'}
                        </div>
                      )}
                    </div>

                    {/* Hiệu lực từ */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        Hiệu lực từ
                      </label>
                      {isEditingInsurance || !insurance ? (
                        <input
                          type="date"
                          value={insuranceData.hieuLucTu}
                          onChange={(e) => handleInsuranceInputChange('hieuLucTu', e.target.value)}
                          className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                        />
                      ) : (
                        <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                          {insurance && insurance.hieuLucTu ? formatDate(insurance.hieuLucTu) : 'Chưa cập nhật'}
                        </div>
                      )}
                    </div>

                    {/* Hiệu lực đến */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        Hiệu lực đến
                      </label>
                      {isEditingInsurance || !insurance ? (
                        <input
                          type="date"
                          value={insuranceData.hieuLucDen}
                          onChange={(e) => handleInsuranceInputChange('hieuLucDen', e.target.value)}
                          className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                        />
                      ) : (
                        <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                          {insurance && insurance.hieuLucDen ? formatDate(insurance.hieuLucDen) : 'Chưa cập nhật'}
                        </div>
                      )}
                    </div>

                    {/* Trạng thái */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-slate-500" />
                        Trạng thái
                      </label>
                      {isEditingInsurance || !insurance ? (
                        <select
                          value={insuranceData.trangThai}
                          onChange={(e) => handleInsuranceInputChange('trangThai', e.target.value)}
                          className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                        >
                          <option value="">Chọn trạng thái</option>
                          <option value="Có hiệu lực">Có hiệu lực</option>
                          <option value="Hết hiệu lực">Hết hiệu lực</option>
                          <option value="Tạm ngưng">Tạm ngưng</option>
                          <option value="Đang chờ kích hoạt">Đang chờ kích hoạt</option>
                        </select>
                      ) : (
                        <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                          {insurance && insurance.trangThai ? (
                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-semibold ${
                              insurance.trangThai === 'Có hiệu lực' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : insurance.trangThai === 'Hết hiệu lực'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {insurance.trangThai === 'Có hiệu lực' && <CheckCircle2 className="w-4 h-4" />}
                              {insurance.trangThai === 'Hết hiệu lực' && <AlertCircle className="w-4 h-4" />}
                              {insurance.trangThai}
                            </span>
                          ) : (
                            <span className="text-slate-500">Chưa cập nhật</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* BHYT Images Upload Section */}
                  <div className="md:col-span-2 mt-6 pt-6 border-t border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-teal-600" />
                      Ảnh thẻ BHYT
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Mặt trước */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Mặt trước thẻ BHYT
                        </label>
                        {insurance?.anhMatTruoc && !matTruocPreview ? (
                          <div className="relative group">
                            <img
                              src={insurance.anhMatTruoc}
                              alt="Mặt trước BHYT"
                              className="w-full h-48 object-cover rounded-xl border-2 border-slate-200"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) handleImageSelect('truoc', file);
                                  };
                                  input.click();
                                }}
                                className="px-4 py-2 bg-white text-slate-900 rounded-lg font-semibold hover:bg-slate-100 transition-all flex items-center gap-2"
                              >
                                <Upload className="w-4 h-4" />
                                Thay đổi
                              </button>
                            </div>
                          </div>
                        ) : matTruocPreview ? (
                          <div className="relative">
                            <img
                              src={matTruocPreview}
                              alt="Preview mặt trước"
                              className="w-full h-48 object-cover rounded-xl border-2 border-teal-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage('truoc')}
                              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) handleImageSelect('truoc', file);
                              };
                              input.click();
                            }}
                            className="w-full h-48 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 hover:bg-teal-50 transition-all"
                          >
                            <Upload className="w-12 h-12 text-slate-400 mb-2" />
                            <p className="text-sm text-slate-600 font-semibold">Chọn ảnh mặt trước</p>
                            <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP (tối đa 5MB)</p>
                          </div>
                        )}
                      </div>

                      {/* Mặt sau */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Mặt sau thẻ BHYT
                        </label>
                        {insurance?.anhMatSau && !matSauPreview ? (
                          <div className="relative group">
                            <img
                              src={insurance.anhMatSau}
                              alt="Mặt sau BHYT"
                              className="w-full h-48 object-cover rounded-xl border-2 border-slate-200"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) handleImageSelect('sau', file);
                                  };
                                  input.click();
                                }}
                                className="px-4 py-2 bg-white text-slate-900 rounded-lg font-semibold hover:bg-slate-100 transition-all flex items-center gap-2"
                              >
                                <Upload className="w-4 h-4" />
                                Thay đổi
                              </button>
                            </div>
                          </div>
                        ) : matSauPreview ? (
                          <div className="relative">
                            <img
                              src={matSauPreview}
                              alt="Preview mặt sau"
                              className="w-full h-48 object-cover rounded-xl border-2 border-teal-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage('sau')}
                              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) handleImageSelect('sau', file);
                              };
                              input.click();
                            }}
                            className="w-full h-48 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 hover:bg-teal-50 transition-all"
                          >
                            <Upload className="w-12 h-12 text-slate-400 mb-2" />
                            <p className="text-sm text-slate-600 font-semibold">Chọn ảnh mặt sau</p>
                            <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP (tối đa 5MB)</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Upload button */}
                    {(matTruocFile || matSauFile) && (
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={handleUploadImages}
                          disabled={uploadImagesMutation.isPending}
                          className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {uploadImagesMutation.isPending ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              Đang upload...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Upload ảnh
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {(isEditingInsurance || !insurance) && (
                    <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={handleInsuranceCancel}
                        className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleInsuranceSubmit}
                        disabled={updateInsuranceMutation.isPending}
                        className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updateInsuranceMutation.isPending ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            Đang lưu...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Lưu thông tin BHYT
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Emergency Contact Card */}
          <div className="bg-white rounded-2xl border-2 border-red-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-orange-600 p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Liên hệ khẩn cấp</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Emergency Contact Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-500" />
                    Họ và tên
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.emergencyContact.name}
                      onChange={(e) => handleInputChange('emergencyContact.name', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                      placeholder="Nhập họ và tên"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                      {profile.emergencyContact?.name || 'Chưa cập nhật'}
                    </div>
                  )}
                </div>

                {/* Emergency Contact Phone */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-500" />
                    Số điện thoại
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.emergencyContact.phone}
                      onChange={(e) => handleInputChange('emergencyContact.phone', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                      placeholder="Nhập số điện thoại"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                      {profile.emergencyContact?.phone || 'Chưa cập nhật'}
                    </div>
                  )}
                </div>

                {/* Relationship */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <UserCircle className="w-4 h-4 text-slate-500" />
                    Mối quan hệ
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.emergencyContact.relationship}
                      onChange={(e) => handleInputChange('emergencyContact.relationship', e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                      placeholder="VD: Vợ, Chồng, Bố, Mẹ..."
                    />
                  ) : (
                    <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                      {profile.emergencyContact?.relationship || 'Chưa cập nhật'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Account Info Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-slate-500 to-slate-600 p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Thông tin tài khoản</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Ngày tạo tài khoản
                  </label>
                  <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                    {profile.createdAt ? formatDate(profile.createdAt) : 'N/A'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Cập nhật lần cuối
                  </label>
                  <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                    {profile.updatedAt ? formatDate(profile.updatedAt) : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </PatientLayout>
  );
}

// Address Selector Component
function AddressSelector({
  province,
  district,
  ward,
  addressDetail,
  onProvinceChange,
  onDistrictChange,
  onWardChange,
  onAddressDetailChange,
}: {
  province: string;
  district: string;
  ward: string;
  addressDetail: string;
  onProvinceChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
  onWardChange: (value: string) => void;
  onAddressDetailChange: (value: string) => void;
}) {
  const selectedProvince = vietnamAddresses.find(p => p.code === province);
  const selectedDistrict = selectedProvince?.districts.find(d => d.code === district);
  const availableDistricts = selectedProvince?.districts || [];
  const availableWards = selectedDistrict?.wards || [];

  return (
    <div className="space-y-4">
      {/* Province Selection */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">
          Tỉnh/Thành phố <span className="text-red-500">*</span>
        </label>
        <select
          value={province}
          onChange={(e) => onProvinceChange(e.target.value)}
          className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
          required
        >
          <option value="">-- Chọn Tỉnh/Thành phố --</option>
          {vietnamAddresses.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* District Selection */}
      {province && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">
            Quận/Huyện <span className="text-red-500">*</span>
          </label>
          <select
            value={district}
            onChange={(e) => onDistrictChange(e.target.value)}
            className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
            required={!!province}
            disabled={!province}
          >
            <option value="">-- Chọn Quận/Huyện --</option>
            {availableDistricts.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Ward Selection */}
      {district && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">
            Phường/Xã <span className="text-red-500">*</span>
          </label>
          <select
            value={ward}
            onChange={(e) => onWardChange(e.target.value)}
            className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
            required={!!district}
            disabled={!district}
          >
            <option value="">-- Chọn Phường/Xã --</option>
            {availableWards.map((w) => (
              <option key={w.code} value={w.code}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Address Detail (Số nhà, tên đường) */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">
          Số nhà, tên đường
        </label>
        <input
          type="text"
          value={addressDetail}
          onChange={(e) => onAddressDetailChange(e.target.value)}
          placeholder="VD: 123 Đường ABC"
          className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
        />
      </div>

      {/* Preview Full Address */}
      {province && district && ward && (
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
          <p className="text-xs font-medium text-teal-700 mb-1">Địa chỉ đầy đủ:</p>
          <p className="text-sm text-teal-900">
            {[
              addressDetail,
              availableWards.find(w => w.code === ward)?.name,
              availableDistricts.find(d => d.code === district)?.name,
              selectedProvince?.name
            ].filter(Boolean).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
