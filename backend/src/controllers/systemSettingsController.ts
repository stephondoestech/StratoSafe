import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { SystemSettings } from '../models/SystemSettings';
import { User, UserRole } from '../models/User';

const systemSettingsRepository = AppDataSource.getRepository(SystemSettings);
const userRepository = AppDataSource.getRepository(User);

// Get the global settings object, creating it if it doesn't exist
export const getGlobalSettings = async (): Promise<SystemSettings> => {
  let settings = await systemSettingsRepository.findOne({ where: { id: 'global' } });

  if (!settings) {
    // Create default settings if they don't exist
    settings = new SystemSettings();
    settings.id = 'global';
    settings.allowRegistration = true; // Default to allowing registration
    await systemSettingsRepository.save(settings);
    console.log('Created default global settings');
  }

  return settings;
};

// Simple function to check if registration is allowed
export const isRegistrationAllowed = async (): Promise<boolean> => {
  try {
    const settings = await getGlobalSettings();
    console.log(`Registration check: allowRegistration=${settings.allowRegistration}`);
    return settings.allowRegistration;
  } catch (error) {
    console.error('Error checking registration status:', error);
    // Default to allowing registration on error for safety
    return true;
  }
};

// API endpoint to get system settings
export const getSystemSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await getGlobalSettings();

    // Get user to check role
    const userId = req.user?.id;
    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // For non-admin users, only return allowRegistration
    if (user.role !== UserRole.ADMIN) {
      res.json({
        allowRegistration: settings.allowRegistration,
      });
      return;
    }

    // For admin users, return full settings
    res.json(settings);
  } catch (error) {
    console.error('Error retrieving system settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// API endpoint to update system settings (admin only - protected by middleware)
export const updateSystemSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { allowRegistration } = req.body;

    if (allowRegistration === undefined) {
      res.status(400).json({ message: 'Missing required field: allowRegistration' });
      return;
    }

    const settings = await getGlobalSettings();

    // Update the setting
    settings.allowRegistration = allowRegistration;
    await systemSettingsRepository.save(settings);

    console.log(`Updated allowRegistration to: ${allowRegistration}`);

    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// API endpoint to get all users with their roles (admin only)
export const getUsersWithRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await userRepository.find({
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'createdAt'],
    });

    res.json(users);
  } catch (error) {
    console.error('Error getting users with roles:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// API endpoint to update a user's role (admin only)
export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, role } = req.body;

    if (!userId || !role) {
      res.status(400).json({ message: 'Missing required fields: userId and role' });
      return;
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      res.status(400).json({
        message: `Invalid role. Must be one of: ${Object.values(UserRole).join(', ')}`,
      });
      return;
    }

    // Don't allow changing your own role
    if (userId === req.user?.id) {
      res.status(400).json({ message: 'You cannot change your own role' });
      return;
    }

    // Find the user
    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Update the role
    user.role = role as UserRole;
    await userRepository.save(user);

    console.log(`Updated user ${user.email} role to: ${role}`);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
