import client from './client'

const api = {
    // Registrar nuevo usuario
    register: (userData) => client.post('/api/v1/auth/register', userData),
    
    // Iniciar sesión
    login: (credentials) => client.post('/api/v1/auth/login', credentials),
    
    // Obtener perfil del usuario
    getProfile: () => client.get('/api/v1/auth/profile'),
    
    // Actualizar perfil del usuario
    updateProfile: (updateData) => client.put('/api/v1/auth/profile', updateData),
    
    // Verificar token
    verifyToken: (token) => client.post('/api/v1/auth/verify-token', { token }),
    
    // Obtener estado del servicio de autenticación
    getStatus: () => client.get('/api/v1/auth/status')
}

export default api