import React, { useState } from 'react'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    Card,
    CardContent,
    CardActions,
    Typography,
    Chip,
    Stack,
    Box,
    TextField,
    InputAdornment,
    IconButton,
    Avatar,
    Rating,
    Tooltip
} from '@mui/material'
import {
    IconSearch,
    IconX,
    IconUsers,
    IconFileAnalytics,
    IconPencil,
    IconRobot,
    IconBrain,
    IconWorldWww,
    IconShoppingCart,
    IconHeadphones,
    IconCode,
    IconSchool,
    IconShieldCheck,
    IconCurrencyDollar
} from '@tabler/icons-react'

const templates = [
    {
        id: 'customer-support',
        name: 'Customer Support Assistant',
        description: 'Handles customer inquiries, provides instant responses to common questions, and escalates complex issues',
        icon: <IconHeadphones />,
        category: 'Support',
        difficulty: 'Beginner',
        avgSetupTime: '5 min',
        popularityScore: 95,
        rating: 4.8,
        usageCount: 15200,
        features: ['24/7 Availability', 'Multi-language', 'Ticket Management', 'FAQ Handling'],
        prefilledData: {
            description: 'I need a customer support agent that can answer common questions about our products and services, handle support tickets, and escalate complex issues to human agents when needed.',
            clarifications: {
                'primary-use': 'customer-support',
                'features': ['memory', 'multilingual', 'api-integration'],
                'expected-volume': 'medium'
            }
        }
    },
    {
        id: 'document-analyzer',
        name: 'Document & PDF Analyzer',
        description: 'Extract insights from documents, PDFs, and text files. Answer questions about uploaded content',
        icon: <IconFileAnalytics />,
        category: 'Analysis',
        difficulty: 'Intermediate',
        avgSetupTime: '10 min',
        popularityScore: 88,
        rating: 4.6,
        usageCount: 8500,
        features: ['File Upload', 'Text Extraction', 'Summarization', 'Q&A on Documents'],
        prefilledData: {
            description: 'I want an AI agent that can analyze uploaded PDF documents, extract key information, summarize content, and answer questions about the documents.',
            clarifications: {
                'primary-use': 'data-analysis',
                'features': ['file-upload', 'memory'],
                'expected-volume': 'low'
            }
        }
    },
    {
        id: 'content-creator',
        name: 'Content Writing Assistant',
        description: 'Generate blog posts, social media content, product descriptions, and marketing copy',
        icon: <IconPencil />,
        category: 'Creative',
        difficulty: 'Beginner',
        avgSetupTime: '5 min',
        popularityScore: 82,
        rating: 4.5,
        usageCount: 12000,
        features: ['SEO Optimization', 'Multiple Formats', 'Tone Adjustment', 'Plagiarism Check'],
        prefilledData: {
            description: 'I need an AI agent to help create engaging content for blogs, social media, and marketing materials with proper SEO optimization.',
            clarifications: {
                'primary-use': 'content-creation',
                'features': ['web-search'],
                'expected-volume': 'medium'
            }
        }
    },
    {
        id: 'web-researcher',
        name: 'Web Research Assistant',
        description: 'Search the web for information, compile research reports, and stay updated on topics',
        icon: <IconWorldWww />,
        category: 'Research',
        difficulty: 'Intermediate',
        avgSetupTime: '8 min',
        popularityScore: 85,
        rating: 4.7,
        usageCount: 9800,
        features: ['Real-time Search', 'Source Citation', 'Fact Checking', 'Report Generation'],
        prefilledData: {
            description: 'I want an AI that can search the web for current information, compile research on specific topics, and generate comprehensive reports with citations.',
            clarifications: {
                'primary-use': 'automation',
                'features': ['web-search', 'memory'],
                'expected-volume': 'low'
            }
        }
    },
    {
        id: 'code-assistant',
        name: 'Code & Development Helper',
        description: 'Help with coding, debugging, code reviews, and technical documentation',
        icon: <IconCode />,
        category: 'Technical',
        difficulty: 'Advanced',
        avgSetupTime: '15 min',
        popularityScore: 78,
        rating: 4.9,
        usageCount: 6500,
        features: ['Multi-language Support', 'Code Generation', 'Bug Detection', 'Documentation'],
        prefilledData: {
            description: 'I need a coding assistant that can help write code, debug issues, perform code reviews, and generate technical documentation.',
            clarifications: {
                'primary-use': 'automation',
                'features': ['file-upload', 'api-integration'],
                'expected-volume': 'high'
            }
        }
    },
    {
        id: 'sales-assistant',
        name: 'Sales & Lead Generation',
        description: 'Qualify leads, schedule meetings, provide product information, and nurture prospects',
        icon: <IconCurrencyDollar />,
        category: 'Sales',
        difficulty: 'Intermediate',
        avgSetupTime: '12 min',
        popularityScore: 75,
        rating: 4.4,
        usageCount: 5200,
        features: ['Lead Scoring', 'CRM Integration', 'Email Automation', 'Meeting Scheduling'],
        prefilledData: {
            description: 'I want a sales assistant that can qualify leads, answer product questions, schedule meetings, and integrate with our CRM system.',
            clarifications: {
                'primary-use': 'customer-support',
                'features': ['memory', 'api-integration'],
                'expected-volume': 'medium'
            }
        }
    }
]

const categoryColors = {
    'Support': 'primary',
    'Analysis': 'secondary',
    'Creative': 'success',
    'Research': 'info',
    'Technical': 'warning',
    'Sales': 'error'
}

const difficultyColors = {
    'Beginner': 'success',
    'Intermediate': 'warning',
    'Advanced': 'error'
}

const TemplateSelector = ({ open, onClose, onSelect }) => {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('All')

    const categories = ['All', ...new Set(templates.map(t => t.category))]

    const filteredTemplates = templates.filter(template => {
        const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            template.description.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory
        return matchesSearch && matchesCategory
    })

    const handleSelectTemplate = (template) => {
        onSelect(template.prefilledData)
        onClose()
    }

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: { height: '85vh' }
            }}
        >
            <DialogTitle>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6">Choose a Template</Typography>
                    <IconButton onClick={onClose} size="small">
                        <IconX />
                    </IconButton>
                </Stack>
            </DialogTitle>
            
            <DialogContent>
                {/* Search and Filter Bar */}
                <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                    <TextField
                        fullWidth
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <IconSearch size={20} />
                                </InputAdornment>
                            )
                        }}
                    />
                    <Stack direction="row" spacing={1}>
                        {categories.map((category) => (
                            <Chip
                                key={category}
                                label={category}
                                onClick={() => setSelectedCategory(category)}
                                color={selectedCategory === category ? 'primary' : 'default'}
                                variant={selectedCategory === category ? 'filled' : 'outlined'}
                            />
                        ))}
                    </Stack>
                </Stack>

                {/* Template Grid */}
                <Grid container spacing={3}>
                    {filteredTemplates.map((template) => (
                        <Grid item xs={12} md={6} key={template.id}>
                            <Card 
                                sx={{ 
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'all 0.3s',
                                    cursor: 'pointer',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: 3
                                    }
                                }}
                                onClick={() => handleSelectTemplate(template)}
                            >
                                <CardContent sx={{ flex: 1 }}>
                                    {/* Header */}
                                    <Stack direction="row" alignItems="flex-start" spacing={2} sx={{ mb: 2 }}>
                                        <Avatar
                                            sx={{ 
                                                bgcolor: `${categoryColors[template.category]}.light`,
                                                color: `${categoryColors[template.category]}.main`
                                            }}
                                        >
                                            {template.icon}
                                        </Avatar>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="h6" gutterBottom>
                                                {template.name}
                                            </Typography>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Chip 
                                                    label={template.category} 
                                                    size="small"
                                                    color={categoryColors[template.category]}
                                                />
                                                <Chip 
                                                    label={template.difficulty}
                                                    size="small"
                                                    color={difficultyColors[template.difficulty]}
                                                    variant="outlined"
                                                />
                                                <Typography variant="caption" color="text.secondary">
                                                    • {template.avgSetupTime}
                                                </Typography>
                                            </Stack>
                                        </Box>
                                    </Stack>

                                    {/* Description */}
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        {template.description}
                                    </Typography>

                                    {/* Features */}
                                    <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 2 }}>
                                        {template.features.map((feature, index) => (
                                            <Chip
                                                key={index}
                                                label={feature}
                                                size="small"
                                                variant="outlined"
                                                sx={{ mb: 0.5 }}
                                            />
                                        ))}
                                    </Stack>

                                    {/* Stats */}
                                    <Stack direction="row" alignItems="center" spacing={2}>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Rating value={template.rating} readOnly size="small" precision={0.1} />
                                            <Typography variant="caption" sx={{ ml: 0.5 }}>
                                                {template.rating}
                                            </Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary">
                                            <IconUsers size={14} style={{ verticalAlign: 'middle' }} /> {template.usageCount.toLocaleString()} users
                                        </Typography>
                                    </Stack>
                                </CardContent>

                                <CardActions>
                                    <Button 
                                        fullWidth 
                                        variant="contained"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleSelectTemplate(template)
                                        }}
                                    >
                                        Use This Template
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                {filteredTemplates.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Typography variant="h6" color="text.secondary">
                            No templates found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Try adjusting your search or filters
                        </Typography>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    )
}

export default TemplateSelector