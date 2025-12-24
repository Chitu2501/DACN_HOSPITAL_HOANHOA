import { QueryClient } from '@tanstack/react-query';

/**
 * Prefetch data cho các routes quan trọng
 * Sử dụng trong layout hoặc khi hover vào link
 */
export const prefetchQueries = {
  /**
   * Prefetch doctor dashboard data
   */
  doctorDashboard: async (queryClient: QueryClient) => {
    await queryClient.prefetchQuery({
      queryKey: ['doctor-dashboard'],
      queryFn: async () => {
        const { doctorApi } = await import('@/lib/api');
        const res = await doctorApi.getDashboard();
        return res.data?.data || {};
      },
      staleTime: 2 * 60 * 1000,
    });
  },

  /**
   * Prefetch patient profile
   */
  patientProfile: async (queryClient: QueryClient) => {
    await queryClient.prefetchQuery({
      queryKey: ['patient-profile'],
      queryFn: async () => {
        const { patientProfileApi } = await import('@/lib/api');
        const response = await patientProfileApi.get();
        return response.data;
      },
      staleTime: 15 * 60 * 1000,
    });
  },

  /**
   * Prefetch doctor profile
   */
  doctorProfile: async (queryClient: QueryClient) => {
    await queryClient.prefetchQuery({
      queryKey: ['doctor-profile'],
      queryFn: async () => {
        const { doctorProfileApi } = await import('@/lib/api');
        const res = await doctorProfileApi.get();
        return res.data?.data || {};
      },
      staleTime: 15 * 60 * 1000,
    });
  },

  /**
   * Prefetch patient appointments
   */
  patientAppointments: async (queryClient: QueryClient) => {
    await queryClient.prefetchQuery({
      queryKey: ['patient-appointments'],
      queryFn: async () => {
        const { appointmentsApi } = await import('@/lib/api');
        const response = await appointmentsApi.getAll({ status: 'confirmed,pending' });
        return response.data;
      },
      staleTime: 2 * 60 * 1000,
    });
  },
};

