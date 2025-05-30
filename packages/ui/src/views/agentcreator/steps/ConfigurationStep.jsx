import React, { useState } from 'react'
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    CardActions,
    Stack,
    Alert,
    AlertTitle,
    Avatar,
    Chip,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Tooltip,
    Paper,
    Grid,
    Switch,
    FormControlLabel
} from '@mui/material'
import { 
    IconArrowLeft,
    IconRocket,
    IconRobot,
    IconCheck,
    IconEdit,
    IconBrain,
    IconCurrencyDollar,
    IconGauge,
    IconShieldCheck,
    IconApi,
    IconDatabase,
    IconCode,
    IconSettings,
    IconEye,
    IconEyeOff
} from '@tabler/icons-react'

// Components
import { JSONViewer } from '@/ui-component/json/JsonViewer'

const ConfigEditor = ({ config, onChange, onClose }) => {
    const [editedConfig, setEditedConfig] = useState(config)
    const [activeTab, setActiveTab] = useState('basic')

    const handleSave = () => {
        onChange(editedConfig)
        onClose()
    }

    return (
        <Dialog open onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6">Customize Agent Configuration</Typography>
                    <IconButton onClick={onClose} size="small">
                        <IconEyeOff />
                    </IconButton>
                </Stack>
            </DialogTitle>
            <DialogContent>
                <Stack spacing={3}>
                    {/* Basic Settings */}
                    <Box>
                        <Typography variant="subtitle1" gutterBottom>Basic Information</Typography>
                        <Stack spacing={2}>
                            <TextField
                                fullWidth
                                label="Agent Name"
                                value={editedConfig.name}
                                onChange={(e) => setEditedConfig({ ...editedConfig, name: e.target.value })}
                            />
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="Description"
                                value={editedConfig.description}
                                onChange={(e) => setEditedConfig({ ...editedConfig, description: e.target.value })}
                            />
                        </Stack>
                    </Box>

                    {/* Model Settings */}
                    <Box>
                        <Typography variant="subtitle1" gutterBottom>Model Configuration</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    select
                                    label="AI Model"
                                    value={editedConfig.model}
                                    onChange={(e) => setEditedConfig({ ...editedConfig, model: e.target.value })}
                                    SelectProps={{ native: true }}
                                >
                                    <option value="gpt-4">GPT-4 (Most Capable)</option>
                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast & Affordable)</option>
                                    <option value="claude-3-opus">Claude 3 Opus (Advanced)</option>
                                    <option value="claude-3-sonnet">Claude 3 Sonnet (Balanced)</option>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Temperature"
                                    value={editedConfig.temperature || 0.7}
                                    onChange={(e) => setEditedConfig({ ...editedConfig, temperature: parseFloat(e.target.value) })}
                                    inputProps={{ min: 0, max: 1, step: 0.1 }}
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Advanced Settings */}
                    <Box>
                        <Typography variant="subtitle1" gutterBottom>Advanced Settings</Typography>
                        <Stack spacing={1}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={editedConfig.enableMemory || false}
                                        onChange={(e) => setEditedConfig({ ...editedConfig, enableMemory: e.target.checked })}
                                    />
                                }
                                label="Enable conversation memory"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={editedConfig.enableAnalytics || true}
                                        onChange={(e) => setEditedConfig({ ...editedConfig, enableAnalytics: e.target.checked })}
                                    />
                                }
                                label="Enable usage analytics"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={editedConfig.enableRateLimiting || true}
                                        onChange={(e) => setEditedConfig({ ...editedConfig, enableRateLimiting: e.target.checked })}
                                    />
                                }
                                label="Enable rate limiting"
                            />
                        </Stack>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={handleSave}>Save Changes</Button>
            </DialogActions>
        </Dialog>
    )
}

const ConfigurationStep = ({ configuration, onDeploy, onBack, loading }) => {
    const [showEditor, setShowEditor] = useState(false)
    const [config, setConfig] = useState(configuration)
    const [showRawConfig, setShowRawConfig] = useState(false)

    if (!config) {
        return (
            <Alert severity="error">
                <AlertTitle>Configuration Error</AlertTitle>
                No configuration was generated. Please go back and try again.
            </Alert>
        )
    }

    const features = [
        {
            icon: <IconBrain />,
            title: 'AI Model',
            value: config.model || 'GPT-4',
            color: 'primary'
        },
        {
            icon: <IconCurrencyDollar />,
            title: 'Estimated Cost',
            value: `~$${config.estimatedCost || '0.50'}/request`,
            color: 'success'
        },
        {
            icon: <IconGauge />,
            title: 'Performance',
            value: config.performance || 'Optimized',
            color: 'info'
        },
        {
            icon: <IconShieldCheck />,
            title: 'Security',
            value: 'Enterprise Grade',
            color: 'warning'
        }
    ]

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Success Message */}
            <Alert severity="success" icon={<IconCheck />} sx={{ mb: 3 }}>
                <AlertTitle>Your agent is ready to deploy!</AlertTitle>
                I've configured everything based on your requirements. Review the details below.
            </Alert>

            {/* Agent Preview Card */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    {/* Header */}
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                            <IconRobot size={32} />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h5">{config.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {config.description}
                            </Typography>
                        </Box>
                        <Tooltip title="Edit configuration">
                            <IconButton onClick={() => setShowEditor(true)}>
                                <IconEdit />
                            </IconButton>
                        </Tooltip>
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    {/* Capabilities */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Capabilities
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            {(config.capabilities || []).map((cap, index) => (
                                <Chip 
                                    key={index} 
                                    label={cap} 
                                    size="small"
                                    sx={{ mb: 1 }}
                                />
                            ))}
                        </Stack>
                    </Box>

                    {/* Key Features Grid */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        {features.map((feature, index) => (
                            <Grid item xs={6} md={3} key={index}>
                                <Paper 
                                    variant="outlined" 
                                    sx={{ 
                                        p: 2, 
                                        textAlign: 'center',
                                        height: '100%'
                                    }}
                                >
                                    <Box sx={{ color: `${feature.color}.main`, mb: 1 }}>
                                        {feature.icon}
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">
                                        {feature.title}
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {feature.value}
                                    </Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Technical Details */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>
                            Technical Configuration
                        </Typography>
                        <List dense>
                            <ListItem>
                                <ListItemIcon>
                                    <IconApi size={20} />
                                </ListItemIcon>
                                <ListItemText 
                                    primary="API Integration"
                                    secondary={config.apiIntegration || "RESTful API with WebSocket support"}
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemIcon>
                                    <IconDatabase size={20} />
                                </ListItemIcon>
                                <ListItemText 
                                    primary="Data Sources"
                                    secondary={(config.dataSources || ['Built-in knowledge base']).join(', ')}
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemIcon>
                                    <IconCode size={20} />
                                </ListItemIcon>
                                <ListItemText 
                                    primary="Components"
                                    secondary={`${config.components?.length || 5} components configured`}
                                />
                            </ListItem>
                        </List>
                    </Box>
                </CardContent>

                <CardActions>
                    <Button 
                        size="small" 
                        onClick={() => setShowRawConfig(!showRawConfig)}
                        startIcon={showRawConfig ? <IconEyeOff /> : <IconEye />}
                    >
                        {showRawConfig ? 'Hide' : 'Show'} Raw Configuration
                    </Button>
                </CardActions>

                {showRawConfig && (
                    <Box sx={{ p: 2, bgcolor: 'background.default' }}>
                        <JSONViewer data={config} />
                    </Box>
                )}
            </Card>

            {/* Info Alert */}
            <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                    <strong>What happens next:</strong> Your agent will be deployed to the cloud and you'll receive API credentials to start using it immediately.
                </Typography>
            </Alert>

            {/* Actions */}
            <Stack direction="row" spacing={2} sx={{ mt: 'auto' }}>
                <Button
                    variant="outlined"
                    startIcon={<IconArrowLeft />}
                    onClick={onBack}
                    disabled={loading}
                >
                    Back
                </Button>
                <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={() => onDeploy(config)}
                    disabled={loading}
                    startIcon={<IconRocket />}
                >
                    Deploy Agent
                </Button>
            </Stack>

            {/* Edit Dialog */}
            {showEditor && (
                <ConfigEditor
                    config={config}
                    onChange={setConfig}
                    onClose={() => setShowEditor(false)}
                />
            )}
        </Box>
    )
}

export default ConfigurationStep