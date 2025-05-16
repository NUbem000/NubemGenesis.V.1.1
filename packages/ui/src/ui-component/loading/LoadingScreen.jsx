import { Box, CircularProgress, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { motion } from 'framer-motion'

const LoadingScreen = ({ message = 'Cargando...' }) => {
    const theme = useTheme()

    return (
        <Box
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: theme.palette.background.default,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 9999
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                {/* Logo animado */}
                <Box sx={{ mb: 4 }}>
                    <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                        <motion.circle
                            cx="40" cy="60" r="25"
                            fill={theme.palette.primary.main}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        />
                        <motion.circle
                            cx="60" cy="60" r="30"
                            fill={theme.palette.primary.light}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                        />
                        <motion.circle
                            cx="80" cy="60" r="25"
                            fill={theme.palette.primary.main}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                        />
                        <motion.path
                            d="M60 30 L65 45 L80 45 L68 55 L73 70 L60 60 L47 70 L52 55 L40 45 L55 45 Z"
                            fill={theme.palette.secondary.main}
                            initial={{ opacity: 0, rotate: 0 }}
                            animate={{ opacity: 1, rotate: 360 }}
                            transition={{ duration: 1, delay: 0.5 }}
                        />
                    </svg>
                </Box>
                
                <Typography 
                    variant="h4" 
                    sx={{ 
                        color: theme.palette.text.primary,
                        fontFamily: 'Comforta, sans-serif',
                        fontWeight: 'bold',
                        mb: 2
                    }}
                >
                    NubemGenesis
                </Typography>
                
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress 
                        sx={{ 
                            color: theme.palette.primary.main 
                        }} 
                    />
                    <Box
                        sx={{
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            position: 'absolute',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Typography
                            variant="caption"
                            component="div"
                            color="text.secondary"
                        >
                            {message}
                        </Typography>
                    </Box>
                </Box>
            </motion.div>
        </Box>
    )
}

export default LoadingScreen