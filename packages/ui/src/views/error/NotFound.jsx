import { Box, Typography, Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { CloudOff } from '@mui/icons-material'

const NotFound = () => {
    const navigate = useNavigate()

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                textAlign: 'center',
                px: 3
            }}
        >
            <CloudOff sx={{ fontSize: 100, color: 'text.secondary', mb: 3 }} />
            
            <Typography variant="h1" sx={{ fontSize: '6rem', fontWeight: 'bold', color: 'primary.main' }}>
                404
            </Typography>
            
            <Typography variant="h4" sx={{ mb: 2 }}>
                Página no encontrada
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500 }}>
                La nube que buscas no existe en nuestro cielo digital. 
                Puede que haya sido movida o que la URL esté incorrecta.
            </Typography>
            
            <Button 
                variant="contained" 
                size="large"
                onClick={() => navigate('/')}
                sx={{ 
                    backgroundColor: 'primary.main',
                    '&:hover': {
                        backgroundColor: 'primary.dark',
                    }
                }}
            >
                Volver al inicio
            </Button>
        </Box>
    )
}

export default NotFound