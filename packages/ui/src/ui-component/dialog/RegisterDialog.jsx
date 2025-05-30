import { createPortal } from 'react-dom'
import { useState } from 'react'
import PropTypes from 'prop-types'

import { 
    Dialog, 
    DialogActions, 
    DialogContent, 
    Typography, 
    DialogTitle,
    Alert,
    Box,
    Grid,
    FormHelperText
} from '@mui/material'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { Input } from '@/ui-component/input/Input'

const RegisterDialog = ({ show, onConfirm, onCancel, onShowLogin }) => {
    const portalElement = document.getElementById('portal')
    
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: ''
    })
    
    const [errors, setErrors] = useState({})
    const [isLoading, setIsLoading] = useState(false)

    const inputConfigs = {
        username: {
            label: 'Nombre de Usuario',
            name: 'username',
            type: 'string',
            placeholder: 'usuario123',
            required: true
        },
        email: {
            label: 'Email',
            name: 'email', 
            type: 'email',
            placeholder: 'usuario@ejemplo.com',
            required: true
        },
        firstName: {
            label: 'Nombre',
            name: 'firstName',
            type: 'string',
            placeholder: 'Juan'
        },
        lastName: {
            label: 'Apellido',
            name: 'lastName',
            type: 'string',
            placeholder: 'Pérez'
        },
        password: {
            label: 'Contraseña',
            name: 'password',
            type: 'password',
            required: true
        },
        confirmPassword: {
            label: 'Confirmar Contraseña',
            name: 'confirmPassword',
            type: 'password',
            required: true
        }
    }

    const validateForm = () => {
        const newErrors = {}

        // Validar username
        if (!formData.username.trim()) {
            newErrors.username = 'El nombre de usuario es requerido'
        } else if (formData.username.length < 3) {
            newErrors.username = 'El nombre de usuario debe tener al menos 3 caracteres'
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            newErrors.username = 'Solo se permiten letras, números y guiones bajos'
        }

        // Validar email
        if (!formData.email.trim()) {
            newErrors.email = 'El email es requerido'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Formato de email inválido'
        }

        // Validar password
        if (!formData.password) {
            newErrors.password = 'La contraseña es requerida'
        } else if (formData.password.length < 6) {
            newErrors.password = 'La contraseña debe tener al menos 6 caracteres'
        }

        // Validar confirmación de password
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Debe confirmar la contraseña'
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Las contraseñas no coinciden'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
        
        // Limpiar error del campo cuando el usuario empiece a escribir
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }))
        }
    }

    const handleSubmit = async () => {
        if (!validateForm()) {
            return
        }

        setIsLoading(true)
        
        try {
            const registrationData = {
                username: formData.username,
                email: formData.email,
                password: formData.password,
                firstName: formData.firstName || undefined,
                lastName: formData.lastName || undefined
            }

            await onConfirm(registrationData)
        } catch (error) {
            console.error('Error en registro:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !isLoading) {
            handleSubmit()
        }
    }

    const component = show ? (
        <Dialog
            onKeyUp={handleKeyPress}
            open={show}
            fullWidth
            maxWidth='sm'
            aria-labelledby='register-dialog-title'
        >
            <DialogTitle sx={{ fontSize: '1.25rem', fontWeight: 'bold' }} id='register-dialog-title'>
                Crear Nueva Cuenta
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 1 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Complete el formulario para crear su cuenta en NubemGenesis
                            </Typography>
                        </Grid>
                        
                        <Grid item xs={12}>
                            <Typography>Nombre de Usuario *</Typography>
                            <Input
                                inputParam={inputConfigs.username}
                                onChange={(value) => handleInputChange('username', value)}
                                value={formData.username}
                                showDialog={false}
                            />
                            {errors.username && (
                                <FormHelperText error>{errors.username}</FormHelperText>
                            )}
                        </Grid>

                        <Grid item xs={12}>
                            <Typography>Email *</Typography>
                            <Input
                                inputParam={inputConfigs.email}
                                onChange={(value) => handleInputChange('email', value)}
                                value={formData.email}
                                showDialog={false}
                            />
                            {errors.email && (
                                <FormHelperText error>{errors.email}</FormHelperText>
                            )}
                        </Grid>

                        <Grid item xs={6}>
                            <Typography>Nombre</Typography>
                            <Input
                                inputParam={inputConfigs.firstName}
                                onChange={(value) => handleInputChange('firstName', value)}
                                value={formData.firstName}
                                showDialog={false}
                            />
                        </Grid>

                        <Grid item xs={6}>
                            <Typography>Apellido</Typography>
                            <Input
                                inputParam={inputConfigs.lastName}
                                onChange={(value) => handleInputChange('lastName', value)}
                                value={formData.lastName}
                                showDialog={false}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Typography>Contraseña *</Typography>
                            <Input
                                inputParam={inputConfigs.password}
                                onChange={(value) => handleInputChange('password', value)}
                                value={formData.password}
                                showDialog={false}
                            />
                            {errors.password && (
                                <FormHelperText error>{errors.password}</FormHelperText>
                            )}
                        </Grid>

                        <Grid item xs={12}>
                            <Typography>Confirmar Contraseña *</Typography>
                            <Input
                                inputParam={inputConfigs.confirmPassword}
                                onChange={(value) => handleInputChange('confirmPassword', value)}
                                value={formData.confirmPassword}
                                showDialog={false}
                            />
                            {errors.confirmPassword && (
                                <FormHelperText error>{errors.confirmPassword}</FormHelperText>
                            )}
                        </Grid>

                        <Grid item xs={12}>
                            <Alert severity="info" sx={{ mt: 1 }}>
                                Al registrarse, acepta nuestros términos de servicio y política de privacidad.
                            </Alert>
                        </Grid>
                    </Grid>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Box sx={{ display: 'flex', gap: 1, width: '100%', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <StyledButton 
                            variant='outlined' 
                            onClick={onCancel}
                            disabled={isLoading}
                        >
                            Cancelar
                        </StyledButton>
                        <StyledButton 
                            variant='contained' 
                            onClick={handleSubmit}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                        </StyledButton>
                    </Box>
                    <Box sx={{ textAlign: 'center', mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            ¿Ya tienes cuenta?{' '}
                            <StyledButton 
                                variant="text" 
                                size="small"
                                onClick={onShowLogin}
                                disabled={isLoading}
                                sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                            >
                                Iniciar Sesión
                            </StyledButton>
                        </Typography>
                    </Box>
                </Box>
            </DialogActions>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

RegisterDialog.propTypes = {
    show: PropTypes.bool,
    onConfirm: PropTypes.func,
    onCancel: PropTypes.func,
    onShowLogin: PropTypes.func
}

export default RegisterDialog