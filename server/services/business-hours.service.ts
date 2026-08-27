import { db } from '../db/database.js';

export interface BusinessHoursStatus {
  isWorkingTime: boolean;
  isLunchTime: boolean;
  statusText: string;
  badgeType: 'open' | 'lunch' | 'closed';
  workStartTime: string;
  workEndTime: string;
  lunchStartTime: string;
  lunchEndTime: string;
  workDays: number[];
  respectBusinessHours: boolean;
}

export class BusinessHoursService {

  public static getSettings() {
    try {
      const row = db.prepare('SELECT * FROM ai_agent_settings WHERE id = ?').get('default') as any;
      if (row) {
        return {
          workStartTime: row.work_start_time || '09:00',
          workEndTime: row.work_end_time || '18:00',
          lunchStartTime: row.lunch_start_time || '12:00',
          lunchEndTime: row.lunch_end_time || '13:00',
          workDays: (row.work_days || '1,2,3,4,5').split(',').map(Number),
          respectBusinessHours: row.respect_business_hours !== 0
        };
      }
    } catch {}

    return {
      workStartTime: '09:00',
      workEndTime: '18:00',
      lunchStartTime: '12:00',
      lunchEndTime: '13:00',
      workDays: [1, 2, 3, 4, 5], // Seg a Sex
      respectBusinessHours: true
    };
  }

  public static saveSettings(settings: {
    workStartTime?: string;
    workEndTime?: string;
    lunchStartTime?: string;
    lunchEndTime?: string;
    workDays?: number[];
    respectBusinessHours?: boolean;
  }) {
    const current = this.getSettings();
    const workStart = settings.workStartTime || current.workStartTime;
    const workEnd = settings.workEndTime || current.workEndTime;
    const lunchStart = settings.lunchStartTime || current.lunchStartTime;
    const lunchEnd = settings.lunchEndTime || current.lunchEndTime;
    const workDaysStr = (settings.workDays || current.workDays).join(',');
    const respect = settings.respectBusinessHours !== undefined ? (settings.respectBusinessHours ? 1 : 0) : (current.respectBusinessHours ? 1 : 0);

    db.prepare(`
      UPDATE ai_agent_settings 
      SET work_start_time = ?, work_end_time = ?, lunch_start_time = ?, lunch_end_time = ?, work_days = ?, respect_business_hours = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 'default'
    `).run(workStart, workEnd, lunchStart, lunchEnd, workDaysStr, respect);

    return this.getSettings();
  }

  /**
   * Checa o status atual em tempo real (horário de atendimento, almoço ou fora do expediente)
   */
  public static checkCurrentStatus(): BusinessHoursStatus {
    const config = this.getSettings();
    if (!config.respectBusinessHours) {
      return {
        isWorkingTime: true,
        isLunchTime: false,
        statusText: 'Atendimento 24h Ativo (Horário comercial desativado)',
        badgeType: 'open',
        ...config
      };
    }

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

    // Checa se hoje é dia de trabalho
    if (!config.workDays.includes(dayOfWeek)) {
      return {
        isWorkingTime: false,
        isLunchTime: false,
        statusText: 'Fechado (Final de Semana / Fora dos dias úteis)',
        badgeType: 'closed',
        ...config
      };
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = config.workStartTime.split(':').map(Number);
    const [endH, endM] = config.workEndTime.split(':').map(Number);
    const [lunchStartH, lunchStartM] = config.lunchStartTime.split(':').map(Number);
    const [lunchEndH, lunchEndM] = config.lunchEndTime.split(':').map(Number);

    const workStartMinutes = startH * 60 + startM;
    const workEndMinutes = endH * 60 + endM;
    const lunchStartMinutes = lunchStartH * 60 + lunchStartM;
    const lunchEndMinutes = lunchEndH * 60 + lunchEndM;

    // Checa se está no intervalo de almoço
    if (currentMinutes >= lunchStartMinutes && currentMinutes < lunchEndMinutes) {
      return {
        isWorkingTime: false,
        isLunchTime: true,
        statusText: `🍽️ Em Intervalo de Almoço (${config.lunchStartTime} às ${config.lunchEndTime})`,
        badgeType: 'lunch',
        ...config
      };
    }

    // Checa se está dentro do horário de trabalho
    if (currentMinutes >= workStartMinutes && currentMinutes < workEndMinutes) {
      return {
        isWorkingTime: true,
        isLunchTime: false,
        statusText: `🟢 Em Horário Comercial (${config.workStartTime} às ${config.workEndTime}) - 8h Diárias`,
        badgeType: 'open',
        ...config
      };
    }

    return {
      isWorkingTime: false,
      isLunchTime: false,
      statusText: `🌙 Fora do Horário de Expediente (Retorna às ${config.workStartTime})`,
      badgeType: 'closed',
      ...config
    };
  }

  /**
   * Mensagem automática educada para quando o cliente mandar mensagem no almoço ou fora de hora
   */
  public static getOutOfHoursMessage(lang: 'BR' | 'US' | 'ES' | 'PT' = 'BR', status: BusinessHoursStatus): string {
    if (status.isLunchTime) {
      if (lang === 'US') {
        return `Hello! We are currently on our lunch break (${status.lunchStartTime} - ${status.lunchEndTime}). Your message has been received and our team will get right back to you as soon as we return at ${status.lunchEndTime}! 🍽️🤝`;
      }
      if (lang === 'ES') {
        return `¡Hola! En este momento nos encontramos en la pausa de comida (${status.lunchStartTime} a ${status.lunchEndTime}). Su mensaje ha sido registrado y le responderemos con prioridad a las ${status.lunchEndTime}! 🍽️🤝`;
      }
      return `Olá! Estamos em intervalo de almoço (${status.lunchStartTime} às ${status.lunchEndTime}). Já registrei sua mensagem e te respondo com prioridade assim que retornarmos às ${status.lunchEndTime}! 🍽️🤝`;
    }

    if (lang === 'US') {
      return `Hello! Thank you for reaching out. Our business hours are Monday through Friday from ${status.workStartTime} to ${status.workEndTime}. Your message is registered and we will gladly assist you first thing in the morning! 🌙🤝`;
    }
    if (lang === 'ES') {
      return `¡Hola! Gracias por comunicarse. Nuestro horario de atención es de lunes a viernes de ${status.workStartTime} a ${status.workEndTime}. ¡Le responderemos a primera hora laboral! 🌙🤝`;
    }
    return `Olá! Obrigado pelo contato. Nosso atendimento comercial funciona de segunda a sexta, das ${status.workStartTime} às ${status.workEndTime} (com intervalo de almoço das ${status.lunchStartTime} às ${status.lunchEndTime}). Já anotei sua solicitação e te responderemos assim que abrirmos o expediente! 🌙🤝`;
  }
}
