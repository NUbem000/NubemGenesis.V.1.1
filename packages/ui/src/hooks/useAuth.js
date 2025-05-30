import { useState, useEffect, useContext, createContext } from 'react'
import authApi from '@/api/auth'

const AuthContext = createContext()

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth debe ser usado dentro de AuthProvider')
    }
    return context
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [token, setToken] = useState(localStorage.getItem('nubemgenesis_token'))

    useEffect(() => {
        checkAuthStatus()
    }, [])

    const checkAuthStatus = async () => {
        setIsLoading(true)
        
        try {
            const storedToken = localStorage.getItem('nubemgenesis_token')
            
            if (!storedToken) {
                setIsLoading(false)
                return
            }

            const response = await authApi.verifyToken(storedToken)
            
            if (response.data.valid) {
                setUser(response.data.user)
                setIsAuthenticated(true)
                setToken(storedToken)
                
                // Configurar token en el cliente API
                if (window.apiClient) {
                    window.apiClient.defaults.headers.Authorization = `Bearer ${storedToken}`
                }
            } else {
                logout()
            }
        } catch (error) {
            console.error('Error verificando autenticación:', error)
            logout()
        } finally {
            setIsLoading(false)
        }
    }

    const login = async (credentials) => {
        try {
            const response = await authApi.login(credentials)
            const { user: userData, token: userToken } = response.data

            setUser(userData)
            setIsAuthenticated(true)
            setToken(userToken)
            
            localStorage.setItem('nubemgenesis_token', userToken)
            
            // Configurar token en el cliente API
            if (window.apiClient) {
                window.apiClient.defaults.headers.Authorization = `Bearer ${userToken}`
            }

            return response.data
        } catch (error) {
            console.error('Error en login:', error)
            throw error
        }
    }

    const register = async (userData) => {
        try {
            const response = await authApi.register(userData)
            const { user: newUser, token: userToken } = response.data

            setUser(newUser)
            setIsAuthenticated(true)
            setToken(userToken)
            
            localStorage.setItem('nubemgenesis_token', userToken)
            
            // Configurar token en el cliente API
            if (window.apiClient) {
                window.apiClient.defaults.headers.Authorization = `Bearer ${userToken}`
            }

            return response.data
        } catch (error) {
            console.error('Error en registro:', error)
            throw error
        }
    }

    const logout = () => {
        setUser(null)
        setIsAuthenticated(false)
        setToken(null)
        
        localStorage.removeItem('nubemgenesis_token')
        
        // Remover token del cliente API
        if (window.apiClient) {
            delete window.apiClient.defaults.headers.Authorization
        }
    }

    const updateProfile = async (updateData) => {
        try {
            const response = await authApi.updateProfile(updateData)
            setUser(response.data.user)
            return response.data
        } catch (error) {
            console.error('Error actualizando perfil:', error)
            throw error
        }
    }

    const value = {
        user,
        isAuthenticated,
        isLoading,
        token,
        login,
        register,
        logout,
        updateProfile,
        checkAuthStatus
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}