#!/usr/bin/env node

/**
 * Script para reinicializar las credenciales de administrador en NubemGenesis
 * Uso: node reset-admin-credentials.js
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuración
const CONFIG = {
    urls: [
        'https://nubemgenesis-zqvgtbn4ya-uc.a.run.app',
        'https://app.nubemcode.com'
    ],
    adminCredentials: {
        username: 'admin',
        email: 'admin@nubemgenesis.ai',
        password: 'NubemAdmin2025!'
    }
};

class AdminReset {
    constructor() {
        this.success = false;
    }

    async resetCredentials() {
        console.log('🔄 Iniciando reinicialización de credenciales de administrador...\n');

        for (const url of CONFIG.urls) {
            console.log(`📡 Probando con: ${url}`);
            
            try {
                // 1. Verificar el estado del servicio
                const healthCheck = await this.checkHealth(url);
                if (!healthCheck) {
                    console.log(`❌ Servicio no disponible en ${url}\n`);
                    continue;
                }

                // 2. Intentar crear/reinicializar admin
                const resetResult = await this.performReset(url);
                if (resetResult) {
                    console.log(`✅ Credenciales configuradas exitosamente en ${url}\n`);
                    this.success = true;
                    break;
                }

            } catch (error) {
                console.log(`❌ Error en ${url}: ${error.message}\n`);
            }
        }

        if (this.success) {
            this.printSuccessInfo();
        } else {
            this.printTroubleshootingInfo();
        }
    }

    async checkHealth(baseUrl) {
        try {
            const response = await this.makeRequest('GET', `${baseUrl}/api/v1/ping`);
            return response.statusCode === 200;
        } catch (error) {
            // Verificar si al menos la URL responde
            try {
                const basicResponse = await this.makeRequest('GET', baseUrl);
                return basicResponse.statusCode < 500;
            } catch {
                return false;
            }
        }
    }

    makeRequest(method, url, data = null) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: method,
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'NubemGenesis-AdminReset/1.0'
                }
            };

            if (data) {
                const postData = JSON.stringify(data);
                options.headers['Content-Length'] = Buffer.byteLength(postData);
            }

            const client = urlObj.protocol === 'https:' ? https : http;
            
            const req = client.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                res.on('end', () => {
                    try {
                        const parsedData = responseData ? JSON.parse(responseData) : {};
                        resolve({
                            statusCode: res.statusCode,
                            data: parsedData,
                            headers: res.headers
                        });
                    } catch {
                        resolve({
                            statusCode: res.statusCode,
                            data: responseData,
                            headers: res.headers
                        });
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            if (data) {
                req.write(JSON.stringify(data));
            }
            
            req.end();
        });
    }

    async performReset(baseUrl) {
        const methods = [
            () => this.resetViaAPI(baseUrl),
            () => this.resetViaDirectDB(baseUrl),
            () => this.resetViaEnvConfig(baseUrl)
        ];

        for (const method of methods) {
            try {
                const result = await method();
                if (result) return true;
            } catch (error) {
                console.log(`   ⚠️  Método falló: ${error.message}`);
            }
        }
        return false;
    }

    async resetViaAPI(baseUrl) {
        console.log('   🔧 Intentando reset vía API...');

        // Intentar crear usuario admin
        const userData = {
            username: CONFIG.adminCredentials.username,
            email: CONFIG.adminCredentials.email,
            password: CONFIG.adminCredentials.password,
            role: 'admin'
        };

        // Probar diferentes endpoints de creación de usuario
        const endpoints = [
            '/api/v1/users',
            '/api/v1/auth/register',
            '/api/v1/admin/create',
            '/api/v1/setup/admin'
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await this.makeRequest('POST', `${baseUrl}${endpoint}`, userData);

                if (response.statusCode >= 200 && response.statusCode < 300) {
                    console.log(`   ✅ Usuario creado vía ${endpoint}`);
                    return true;
                }
            } catch (error) {
                // Continuar con el siguiente endpoint
            }
        }

        return false;
    }

    async resetViaDirectDB(baseUrl) {
        console.log('   🔧 Intentando reset vía configuración directa...');

        const configData = {
            FLOWISE_USERNAME: CONFIG.adminCredentials.username,
            FLOWISE_PASSWORD: CONFIG.adminCredentials.password,
            reset: true
        };

        const endpoints = [
            '/api/v1/config/reset',
            '/api/v1/admin/reset',
            '/api/v1/setup/reset'
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await this.makeRequest('POST', `${baseUrl}${endpoint}`, configData);

                if (response.statusCode >= 200 && response.statusCode < 300) {
                    console.log(`   ✅ Configuración actualizada vía ${endpoint}`);
                    return true;
                }
            } catch (error) {
                // Continuar
            }
        }

        return false;
    }

    async resetViaEnvConfig(baseUrl) {
        console.log('   🔧 Intentando configuración de variables de entorno...');

        try {
            // Verificar si hay endpoint de configuración
            const response = await this.makeRequest('PUT', `${baseUrl}/api/v1/settings`, {
                auth: {
                    username: CONFIG.adminCredentials.username,
                    password: CONFIG.adminCredentials.password
                }
            });

            return response.statusCode >= 200 && response.statusCode < 300;
        } catch (error) {
            return false;
        }
    }

    printSuccessInfo() {
        console.log('🎉 ¡CREDENCIALES CONFIGURADAS EXITOSAMENTE!\n');
        console.log('📋 Información de acceso:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`👤 Usuario: ${CONFIG.adminCredentials.username}`);
        console.log(`📧 Email: ${CONFIG.adminCredentials.email}`);
        console.log(`🔐 Contraseña: ${CONFIG.adminCredentials.password}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n🌐 URLs de acceso:');
        CONFIG.urls.forEach(url => {
            console.log(`   • ${url}`);
        });
        console.log('\n💡 Nota: Puede tardar unos minutos en estar disponible.');
    }

    printTroubleshootingInfo() {
        console.log('❌ NO SE PUDIERON CONFIGURAR LAS CREDENCIALES\n');
        console.log('🔧 Pasos de resolución de problemas:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('1. Verificar que los servicios estén ejecutándose');
        console.log('2. Comprobar las variables de entorno');
        console.log('3. Revisar los logs de la aplicación');
        console.log('4. Reiniciar el servicio si es necesario');
        console.log('\n🌐 URLs a verificar:');
        CONFIG.urls.forEach(url => {
            console.log(`   • ${url}`);
        });
        console.log('\n📧 Si el problema persiste, contactar al administrador del sistema.');
    }
}

// Ejecutar el script
async function main() {
    const resetTool = new AdminReset();
    await resetTool.resetCredentials();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = AdminReset;