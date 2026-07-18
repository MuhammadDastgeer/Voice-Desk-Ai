import { createClient } from '@supabase/supabase-js';
import { BusinessProfile, BusinessHours, Appointment, Service, FAQ, AIAgent } from '../types';

// Retrieve environment variables
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

// Check if valid keys are provided
const isConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-supabase-project-id.supabase.co' && 
  supabaseAnonKey !== 'your-anon-public-api-key';

// Initialize actual Supabase client if configured
export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const SUPABASE_STATUS = {
  isConfigured: !!isConfigured,
  url: supabaseUrl || '',
};

// Helper mock storage to keep state persistent across tabs if supabase isn't connected
const LOCAL_USERS_KEY = 'vd_supabase_mock_users';

interface MockUser {
  id: string;
  email: string;
  name: string;
  password?: string;
}

const getMockUsers = (): MockUser[] => {
  const data = localStorage.getItem(LOCAL_USERS_KEY);
  return data ? JSON.parse(data) : [];
};

const saveMockUsers = (users: MockUser[]) => {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
};

/**
 * Custom wrapper functions that seamlessly route to either live Supabase OR 
 * the persistent local sandbox database based on current configuration.
 */
export const supabaseService = {
  isMock: !isConfigured,

  // 1. Sign Up
  async signUp(email: string, password: string, name: string) {
    if (isConfigured && supabase) {
      // Create user in Supabase auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error('No user returned from signup');

      // Create matching business profile row
      const { error: profileError } = await supabase
        .from('business_profiles')
        .insert([{
          id: data.user.id,
          name: name,
          email: email,
        }]);

      if (profileError) {
        console.warn('Profile creation warning:', profileError.message);
      }

      // Create matching business hours row
      const { error: hoursError } = await supabase
        .from('business_hours')
        .insert([{
          id: data.user.id,
        }]);

      if (hoursError) {
        console.warn('Hours creation warning:', hoursError.message);
      }

      return { user: data.user, error: null };
    } else {
      // Sandbox Simulation
      const users = getMockUsers();
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('A user with this email already exists in sandbox database.');
      }

      const id = 'usr-' + Math.random().toString(36).substr(2, 9);
      const newUser: MockUser = { id, email, name, password };
      users.push(newUser);
      saveMockUsers(users);

      // Store matching session details
      localStorage.setItem('vd_current_user_id', id);
      localStorage.setItem('vd_current_user_name', name);
      localStorage.setItem('vd_current_user_email', email);

      // Pre-populate business profile in localStorage
      const initialProfile: BusinessProfile = {
        name: name,
        phone: '555-019-2831',
        email: email,
        address: '100 Main Street',
        city: 'Detroit',
        state: 'MI',
        zip: '48201',
        website: 'www.voicedesk-demo.ai',
        timezone: 'America/New_York'
      };
      localStorage.setItem(`vd_profile_${id}`, JSON.stringify(initialProfile));

      return { user: { id, email, user_metadata: { full_name: name } }, error: null };
    }
  },

  // 2. Sign In
  async signIn(email: string, password: string) {
    if (isConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { user: data.user, error: null };
    } else {
      // Sandbox Simulation
      // Check for demo user
      if (email === 'demo@voicedesk.ai') {
        const demoPassword = localStorage.getItem('vd_demo_user_password') || 'password123';
        if (password === demoPassword) {
          const id = 'usr-demo';
          localStorage.setItem('vd_current_user_id', id);
          localStorage.setItem('vd_current_user_name', 'Demo Workshop');
          localStorage.setItem('vd_current_user_email', 'demo@voicedesk.ai');
          return { user: { id, email: 'demo@voicedesk.ai', user_metadata: { full_name: 'Demo Workshop' } }, error: null };
        }
      }

      const users = getMockUsers();
      const matched = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      
      if (!matched) {
        throw new Error('Invalid email or password.');
      }

      localStorage.setItem('vd_current_user_id', matched.id);
      localStorage.setItem('vd_current_user_name', matched.name);
      localStorage.setItem('vd_current_user_email', matched.email);

      return { user: { id: matched.id, email: matched.email, user_metadata: { full_name: matched.name } }, error: null };
    }
  },

  // 3. Forgot Password
  async resetPassword(email: string) {
    if (isConfigured && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login',
      });
      if (error) throw error;
      return { success: true };
    } else {
      // Sandbox simulation
      const users = getMockUsers();
      const matched = users.some(u => u.email.toLowerCase() === email.toLowerCase()) || email === 'demo@voicedesk.ai';
      
      if (!matched) {
        throw new Error('No account found with this email address.');
      }
      return { success: true };
    }
  },

  // 4. Sign Out
  async signOut() {
    if (isConfigured && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('vd_current_user_id');
    localStorage.removeItem('vd_current_user_name');
    localStorage.removeItem('vd_current_user_email');
    localStorage.setItem('vd_is_logged_in', 'false');
  },

  // 4b. Change Password
  async changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    if (isConfigured && supabase) {
      const email = localStorage.getItem('vd_current_user_email');
      if (!email) throw new Error('No active user logged in.');
      
      // Try signing in with the current email and old password to verify it is correct
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: oldPassword
      });
      if (signInError) {
        throw new Error('Old password is incorrect.');
      }
      
      // If sign in is successful, update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (updateError) throw updateError;
      return true;
    } else {
      // Sandbox simulation
      const userId = localStorage.getItem('vd_current_user_id');
      const email = localStorage.getItem('vd_current_user_email') || 'demo@voicedesk.ai';
      
      // If user is logged in as the standard demo user
      if (email.toLowerCase() === 'demo@voicedesk.ai') {
        const demoPassword = localStorage.getItem('vd_demo_user_password') || 'password123';
        if (oldPassword !== demoPassword) {
          throw new Error('Old password is incorrect.');
        }
        localStorage.setItem('vd_demo_user_password', newPassword);
        return true;
      }
      
      const users = getMockUsers();
      const matched = users.find(u => u.id === userId || u.email.toLowerCase() === email.toLowerCase());
      if (!matched) {
        throw new Error('User not found.');
      }
      if (matched.password !== oldPassword) {
        throw new Error('Old password is incorrect.');
      }
      matched.password = newPassword;
      saveMockUsers(users);
      return true;
    }
  },

  // 5. Get current active user email/name
  getCurrentUser() {
    if (isConfigured && supabase) {
      // Retrieve from memory/session
      const user = localStorage.getItem('vd_current_user_email');
      const name = localStorage.getItem('vd_current_user_name') || 'Valued Partner';
      return { email: user, name };
    } else {
      const email = localStorage.getItem('vd_current_user_email') || 'demo@voicedesk.ai';
      const name = localStorage.getItem('vd_current_user_name') || 'Demo Workshop';
      return { email, name };
    }
  },

  // 6. Get Business Profile
  async getBusinessProfile(userId: string): Promise<BusinessProfile | null> {
    if (isConfigured && supabase) {
      const { data, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching business profile:', error.message);
        return null;
      }
      return data as BusinessProfile;
    } else {
      // Sandbox Simulation
      const saved = localStorage.getItem(`vd_profile_${userId}`);
      return saved ? JSON.parse(saved) : null;
    }
  },

  // 7. Save Business Profile
  async saveBusinessProfile(userId: string, profile: BusinessProfile) {
    if (isConfigured && supabase) {
      // Check if row exists first to handle upsert
      const { data } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('id', userId);

      const hasRow = data && data.length > 0;

      if (hasRow) {
        const { error } = await supabase
          .from('business_profiles')
          .update({
            name: profile.name,
            phone: profile.phone,
            email: profile.email,
            address: profile.address,
            city: profile.city,
            state: profile.state,
            zip: profile.zip,
            website: profile.website,
            timezone: profile.timezone,
          })
          .eq('id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('business_profiles')
          .insert([{
            id: userId,
            name: profile.name,
            phone: profile.phone,
            email: profile.email,
            address: profile.address,
            city: profile.city,
            state: profile.state,
            zip: profile.zip,
            website: profile.website,
            timezone: profile.timezone,
          }]);
        if (error) throw error;
      }
      return true;
    } else {
      // Sandbox Simulation
      localStorage.setItem(`vd_profile_${userId}`, JSON.stringify(profile));
      return true;
    }
  },

  // 8. Get Business Hours
  async getBusinessHours(userId: string): Promise<BusinessHours | null> {
    if (isConfigured && supabase) {
      const { data, error } = await supabase
        .from('business_hours')
        .select('sunday, monday, tuesday, wednesday, thursday, friday, saturday')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching business hours:', error.message);
        return null;
      }
      return data as unknown as BusinessHours;
    } else {
      // Sandbox Simulation
      const saved = localStorage.getItem(`vd_hours_${userId}`);
      return saved ? JSON.parse(saved) : null;
    }
  },

  // 9. Save Business Hours
  async saveBusinessHours(userId: string, hours: BusinessHours) {
    if (isConfigured && supabase) {
      // Check if row exists first to handle upsert
      const { data } = await supabase
        .from('business_hours')
        .select('id')
        .eq('id', userId);

      const hasRow = data && data.length > 0;

      if (hasRow) {
        const { error } = await supabase
          .from('business_hours')
          .update({
            sunday: hours.sunday,
            monday: hours.monday,
            tuesday: hours.tuesday,
            wednesday: hours.wednesday,
            thursday: hours.thursday,
            friday: hours.friday,
            saturday: hours.saturday,
          })
          .eq('id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('business_hours')
          .insert([{
            id: userId,
            sunday: hours.sunday,
            monday: hours.monday,
            tuesday: hours.tuesday,
            wednesday: hours.wednesday,
            thursday: hours.thursday,
            friday: hours.friday,
            saturday: hours.saturday,
          }]);
        if (error) throw error;
      }
      return true;
    } else {
      // Sandbox Simulation
      localStorage.setItem(`vd_hours_${userId}`, JSON.stringify(hours));
      return true;
    }
  },

  // 10. Get Appointments
  async getAppointments(userId: string): Promise<Appointment[]> {
    if (isConfigured && supabase) {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', userId)
        .order('scheduled_at', { ascending: true });

      if (error) {
        console.error('Error fetching appointments:', error.message);
        return [];
      }
      
      return (data || []).map(row => ({
        id: row.id,
        customerName: row.customer_name,
        phoneNumber: row.phone_number,
        vehicleYear: row.vehicle_year || '',
        vehicleMake: row.vehicle_make || '',
        vehicleModel: row.vehicle_model || '',
        serviceId: row.service_id || '',
        scheduledAt: row.scheduled_at,
        status: row.status as any,
        notes: row.notes || ''
      }));
    } else {
      // Sandbox Simulation
      const saved = localStorage.getItem(`vd_appointments_${userId}`);
      return saved ? JSON.parse(saved) : [];
    }
  },

  // 11. Save Appointment (Create/Update)
  async saveAppointment(userId: string, appointment: Appointment): Promise<Appointment> {
    if (isConfigured && supabase) {
      // If appointment.id is missing or looks like a temp client mock ID, treat as new
      const isNew = !appointment.id || appointment.id.startsWith('apt-') || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(appointment.id);
      
      const payload: any = {
        user_id: userId,
        customer_name: appointment.customerName,
        phone_number: appointment.phoneNumber,
        vehicle_year: appointment.vehicleYear,
        vehicle_make: appointment.vehicleMake,
        vehicle_model: appointment.vehicleModel,
        service_id: appointment.serviceId,
        scheduled_at: new Date(appointment.scheduledAt).toISOString(),
        status: appointment.status,
        notes: appointment.notes
      };

      if (isNew) {
        const { data, error } = await supabase
          .from('appointments')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        return {
          id: data.id,
          customerName: data.customer_name,
          phoneNumber: data.phone_number,
          vehicleYear: data.vehicle_year,
          vehicleMake: data.vehicle_make,
          vehicleModel: data.vehicle_model,
          serviceId: data.service_id,
          scheduledAt: data.scheduled_at,
          status: data.status,
          notes: data.notes
        };
      } else {
        const { data, error } = await supabase
          .from('appointments')
          .update(payload)
          .eq('id', appointment.id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return {
          id: data.id,
          customerName: data.customer_name,
          phoneNumber: data.phone_number,
          vehicleYear: data.vehicle_year,
          vehicleMake: data.vehicle_make,
          vehicleModel: data.vehicle_model,
          serviceId: data.service_id,
          scheduledAt: data.scheduled_at,
          status: data.status,
          notes: data.notes
        };
      }
    } else {
      // Sandbox Simulation
      const current = await this.getAppointments(userId);
      let updatedAppt = { ...appointment };
      if (!updatedAppt.id || updatedAppt.id.startsWith('apt-') === false || updatedAppt.id.startsWith('apt-mock') === false) {
        updatedAppt.id = 'apt-mock-' + Math.random().toString(36).substr(2, 9);
      }
      
      const index = current.findIndex(a => a.id === updatedAppt.id);
      if (index !== -1) {
        current[index] = updatedAppt;
      } else {
        current.push(updatedAppt);
      }
      
      localStorage.setItem(`vd_appointments_${userId}`, JSON.stringify(current));
      return updatedAppt;
    }
  },

  // 12. Delete Appointment
  async deleteAppointment(userId: string, appointmentId: string): Promise<boolean> {
    if (isConfigured && supabase) {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } else {
      // Sandbox Simulation
      const current = await this.getAppointments(userId);
      const filtered = current.filter(a => a.id !== appointmentId);
      localStorage.setItem(`vd_appointments_${userId}`, JSON.stringify(filtered));
      return true;
    }
  },

  // 13. Get Services
  async getServices(userId: string): Promise<Service[]> {
    if (isConfigured && supabase) {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching services:', error.message);
        return [];
      }
      
      return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        durationMinutes: row.duration_minutes,
        priceType: row.price_type as any,
        price: Number(row.price),
        isActive: row.is_active
      }));
    } else {
      // Sandbox Simulation
      const saved = localStorage.getItem(`vd_services_${userId}`);
      return saved ? JSON.parse(saved) : [];
    }
  },

  // 14. Save Service (Create/Update)
  async saveService(userId: string, service: Service): Promise<Service> {
    if (isConfigured && supabase) {
      // If service.id is missing or looks like a temp client mock ID, treat as new
      const isNew = !service.id || service.id.startsWith('srv-') || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(service.id);
      
      const payload: any = {
        user_id: userId,
        name: service.name,
        description: service.description,
        duration_minutes: service.durationMinutes,
        price_type: service.priceType,
        price: service.price,
        is_active: service.isActive
      };

      if (isNew) {
        const { data, error } = await supabase
          .from('services')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        return {
          id: data.id,
          name: data.name,
          description: data.description,
          durationMinutes: data.duration_minutes,
          priceType: data.price_type,
          price: Number(data.price),
          isActive: data.is_active
        };
      } else {
        const { data, error } = await supabase
          .from('services')
          .update(payload)
          .eq('id', service.id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return {
          id: data.id,
          name: data.name,
          description: data.description,
          durationMinutes: data.duration_minutes,
          priceType: data.price_type,
          price: Number(data.price),
          isActive: data.is_active
        };
      }
    } else {
      // Sandbox Simulation
      const current = await this.getServices(userId);
      let updatedSrv = { ...service };
      if (!updatedSrv.id || updatedSrv.id.startsWith('srv-') === false || updatedSrv.id.startsWith('srv-mock') === false) {
        updatedSrv.id = 'srv-mock-' + Math.random().toString(36).substr(2, 9);
      }
      
      const index = current.findIndex(s => s.id === updatedSrv.id);
      if (index !== -1) {
        current[index] = updatedSrv;
      } else {
        current.push(updatedSrv);
      }
      
      localStorage.setItem(`vd_services_${userId}`, JSON.stringify(current));
      return updatedSrv;
    }
  },

  // 15. Delete Service
  async deleteService(userId: string, serviceId: string): Promise<boolean> {
    if (isConfigured && supabase) {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } else {
      // Sandbox Simulation
      const current = await this.getServices(userId);
      const filtered = current.filter(s => s.id !== serviceId);
      localStorage.setItem(`vd_services_${userId}`, JSON.stringify(filtered));
      return true;
    }
  },

  // 16. Get FAQs
  async getFAQs(userId: string): Promise<FAQ[]> {
    if (isConfigured && supabase) {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching FAQs:', error.message);
        return [];
      }
      
      return (data || []).map(row => ({
        id: row.id,
        question: row.question,
        answer: row.answer,
        category: row.category
      }));
    } else {
      // Sandbox Simulation
      const saved = localStorage.getItem(`vd_faqs_${userId}`);
      return saved ? JSON.parse(saved) : [];
    }
  },

  // 17. Save FAQ (Create/Update)
  async saveFAQ(userId: string, faq: FAQ): Promise<FAQ> {
    if (isConfigured && supabase) {
      // If faq.id is missing or looks like a temp client mock ID, treat as new
      const isNew = !faq.id || faq.id.startsWith('faq-') || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(faq.id);
      
      const payload: any = {
        user_id: userId,
        question: faq.question,
        answer: faq.answer,
        category: faq.category || 'General'
      };

      if (isNew) {
        const { data, error } = await supabase
          .from('faqs')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        return {
          id: data.id,
          question: data.question,
          answer: data.answer,
          category: data.category
        };
      } else {
        const { data, error } = await supabase
          .from('faqs')
          .update(payload)
          .eq('id', faq.id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return {
          id: data.id,
          question: data.question,
          answer: data.answer,
          category: data.category
        };
      }
    } else {
      // Sandbox Simulation
      const current = await this.getFAQs(userId);
      let updatedFaq = { ...faq };
      if (!updatedFaq.id || updatedFaq.id.startsWith('faq-') === false || updatedFaq.id.startsWith('faq-mock') === false) {
        updatedFaq.id = 'faq-mock-' + Math.random().toString(36).substr(2, 9);
      }
      
      const index = current.findIndex(f => f.id === updatedFaq.id);
      if (index !== -1) {
        current[index] = updatedFaq;
      } else {
        current.push(updatedFaq);
      }
      
      localStorage.setItem(`vd_faqs_${userId}`, JSON.stringify(current));
      return updatedFaq;
    }
  },

  // 18. Delete FAQ
  async deleteFAQ(userId: string, faqId: string): Promise<boolean> {
    if (isConfigured && supabase) {
      const { error } = await supabase
        .from('faqs')
        .delete()
        .eq('id', faqId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } else {
      // Sandbox Simulation
      const current = await this.getFAQs(userId);
      const filtered = current.filter(f => f.id !== faqId);
      localStorage.setItem(`vd_faqs_${userId}`, JSON.stringify(filtered));
      return true;
    }
  },

  // 19. Get Agents
  async getAgents(userId: string): Promise<AIAgent[]> {
    if (isConfigured && supabase) {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching agents:', error.message);
        return [];
      }
      
      return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        voice: row.voice,
        personality: row.personality,
        interruptionSensitivity: row.interruption_sensitivity as any,
        greetingMessage: row.greeting_message,
        systemPrompt: row.system_prompt,
        isActive: row.is_active,
        type: row.type as any
      }));
    } else {
      // Sandbox Simulation
      const saved = localStorage.getItem(`vd_agents_${userId}`);
      return saved ? JSON.parse(saved) : [];
    }
  },

  // 20. Save Agent (Create/Update)
  async saveAgent(userId: string, agent: AIAgent): Promise<AIAgent> {
    if (isConfigured && supabase) {
      // If agent.id is missing or looks like a temp client mock ID, treat as new
      const isNew = !agent.id || agent.id.startsWith('agt-') || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agent.id);
      
      const payload: any = {
        user_id: userId,
        name: agent.name,
        voice: agent.voice,
        personality: agent.personality,
        interruption_sensitivity: agent.interruptionSensitivity,
        greeting_message: agent.greetingMessage,
        system_prompt: agent.systemPrompt,
        is_active: agent.isActive,
        type: agent.type || 'voice'
      };

      if (isNew) {
        const { data, error } = await supabase
          .from('agents')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        return {
          id: data.id,
          name: data.name,
          voice: data.voice,
          personality: data.personality,
          interruptionSensitivity: data.interruption_sensitivity as any,
          greetingMessage: data.greeting_message,
          systemPrompt: data.system_prompt,
          isActive: data.is_active,
          type: data.type as any
        };
      } else {
        const { data, error } = await supabase
          .from('agents')
          .update(payload)
          .eq('id', agent.id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return {
          id: data.id,
          name: data.name,
          voice: data.voice,
          personality: data.personality,
          interruptionSensitivity: data.interruption_sensitivity as any,
          greetingMessage: data.greeting_message,
          systemPrompt: data.system_prompt,
          isActive: data.is_active,
          type: data.type as any
        };
      }
    } else {
      // Sandbox Simulation
      const current = await this.getAgents(userId);
      let updatedAgent = { ...agent };
      if (!updatedAgent.id || updatedAgent.id.startsWith('agt-') === false) {
        updatedAgent.id = 'agt-mock-' + Math.random().toString(36).substr(2, 9);
      }
      
      const index = current.findIndex(a => a.id === updatedAgent.id);
      if (index !== -1) {
        current[index] = updatedAgent;
      } else {
        current.push(updatedAgent);
      }
      
      localStorage.setItem(`vd_agents_${userId}`, JSON.stringify(current));
      return updatedAgent;
    }
  },

  // 21. Delete Agent
  async deleteAgent(userId: string, agentId: string): Promise<boolean> {
    if (isConfigured && supabase) {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', agentId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } else {
      // Sandbox Simulation
      const current = await this.getAgents(userId);
      const filtered = current.filter(a => a.id !== agentId);
      localStorage.setItem(`vd_agents_${userId}`, JSON.stringify(filtered));
      return true;
    }
  }
};
