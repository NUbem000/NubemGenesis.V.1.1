import { Box, Typography, Link, Grid } from '@mui/material'
import { useTheme } from '@mui/material/styles'

const Footer = () => {
    const theme = useTheme()
    const currentYear = new Date().getFullYear()

    return (
        <Box 
            component="footer" 
            sx={{ 
                backgroundColor: theme.palette.background.paper,
                borderTop: `1px solid ${theme.palette.divider}`,
                py: 3,
                px: 4,
                mt: 'auto'
            }}
        >
            <Grid container spacing={3} justifyContent="space-between" alignItems="center">
                <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">
                        © {currentYear} NubemGenesis. Todos los derechos reservados.
                    </Typography>
                </Grid>
                <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        Powered by NubemSystems
                    </Typography>
                </Grid>
                <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                    <Link 
                        href="https://nubemsystems.es" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        sx={{ mr: 2 }}
                    >
                        NubemSystems
                    </Link>
                    <Link 
                        href="/privacy" 
                        sx={{ mr: 2 }}
                    >
                        Privacidad
                    </Link>
                    <Link href="/terms">
                        Términos
                    </Link>
                </Grid>
            </Grid>
        </Box>
    )
}

export default Footer