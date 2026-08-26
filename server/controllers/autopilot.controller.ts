import { Request, Response } from 'express';
import { DailyHunterService } from '../services/daily-hunter.service.js';

export class AutopilotController {
  public static getStatus(req: Request, res: Response): void {
    try {
      const settings = DailyHunterService.getSettings();
      const sentToday = DailyHunterService.getTodayDispatchedCount();
      const recentLogs = DailyHunterService.getRecentLogs(20);

      res.json({
        settings,
        sentToday,
        remainingToday: Math.max(0, settings.dailyQuota - sentToday),
        recentLogs
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static async triggerHunt(req: Request, res: Response): Promise<void> {
    try {
      const { count, market } = req.body;
      const result = await DailyHunterService.executeDailyHunt(
        count ? parseInt(count, 10) : 10,
        market
      );
      res.json({
        success: true,
        ...result
      });
    } catch (err: any) {
      console.error('Erro ao executar caçador diário:', err);
      res.status(500).json({ error: err.message || 'Erro ao executar caçador automático' });
    }
  }

  public static setMarket(req: Request, res: Response): void {
    try {
      const { market } = req.body;
      if (market) {
        DailyHunterService.setMarketPreset(market);
      }
      res.json({ success: true, settings: DailyHunterService.getSettings() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public static updateSettings(req: Request, res: Response): void {
    try {
      const body = req.body;
      DailyHunterService.updateSettings(body);
      res.json({ success: true, settings: DailyHunterService.getSettings() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
