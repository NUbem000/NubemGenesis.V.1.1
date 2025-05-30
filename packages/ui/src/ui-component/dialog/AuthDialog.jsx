import { useState } from 'react'
import PropTypes from 'prop-types'

import LoginDialog from './LoginDialog'
import RegisterDialog from './RegisterDialog'
import authApi from '@/api/auth'

const AuthDialog = ({ show, onClose, onSuccess }) => {
    const [mode, setMode] = useState('login') // 'login' or 'register'
    const [isLoading, setIsLoading] = useState(false)

    const handleLogin = async (username, password) => {
        setIsLoading(true)
        
        try {
            // Intentar login con el método tradicional (basic auth)
            localStorage.setItem('username', username)
            localStorage.setItem('password', password)
            
            // Intentar también con el nuevo sistema JWT
            try {
                const response = await authApi.login({
                    emailOrUsername: username,
                    password: password
                })
                
                if (response.data.token) {
                    localStorage.setItem('nubemgenesis_token', response.data.token)
                    localStorage.setItem('nubemgenesis_user', JSON.stringify(response.data.user))
                }
            } catch (jwtError) {
                console.log('JWT login failed, using basic auth fallback')
            }
            
            onSuccess && onSuccess()
            onClose && onClose()
            
            // Recargar página para aplicar autenticación
            window.location.reload()
            
        } catch (error) {
            console.error('Error en login:', error)
            alert('Error al iniciar sesión: ' + (error.response?.data?.error || error.message))
        } finally {
            setIsLoading(false)
        }
    }

    const handleRegister = async (userData) => {
        setIsLoading(true)
        
        try {
            const response = await authApi.register(userData)
            
            if (response.data.token) {
                localStorage.setItem('nubemgenesis_token', response.data.token)
                localStorage.setItem('nubemgenesis_user', JSON.stringify(response.data.user))
                
                // También configurar para compatibilidad con sistema básico
                localStorage.setItem('username', userData.username)
                localStorage.setItem('password', userData.password)
            }
            
            alert('¡Cuenta creada exitosamente! Bienvenido a NubemGenesis.')
            
            onSuccess && onSuccess()
            onClose && onClose()
            
            // Recargar página para aplicar autenticación
            window.location.reload()
            
        } catch (error) {
            console.error('Error en registro:', error)
            const errorMessage = error.response?.data?.error || error.message || 'Error al crear la cuenta'
            alert('Error al crear cuenta: ' + errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    const switchToRegister = () => {
        setMode('register')
    }

    const switchToLogin = () => {
        setMode('login')
    }

    const handleClose = () => {
        onClose && onClose()
    }

    if (mode === 'register') {
        return (
            <RegisterDialog
                show={show}
                onConfirm={handleRegister}
                onCancel={handleClose}
                onShowLogin={switchToLogin}
            />
        )
    }

    return (
        <LoginDialog
            show={show}
            dialogProps={{
                title: 'Iniciar Sesión',
                confirmButtonName: isLoading ? 'Iniciando...' : 'Iniciar Sesión'
            }}
            onConfirm={handleLogin}
            onShowRegister={switchToRegister}
        />
    )
}

AuthDialog.propTypes = {
    show: PropTypes.bool,
    onClose: PropTypes.func,
    onSuccess: PropTypes.func
}

export default AuthDialog