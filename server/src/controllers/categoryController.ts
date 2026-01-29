import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all categories for a user
export const getCategories = async (req: any, res: Response) => {
    const profileId = req.user.profileId;

    try {
        const categories = await prisma.transactionCategory.findMany({
            where: { profileId },
            orderBy: { name: 'asc' }
        });
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
};

// Create a new category
export const createCategory = async (req: any, res: Response) => {
    const profileId = req.user.profileId;
    const { name, color, icon, keywords } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const category = await prisma.transactionCategory.create({
            data: {
                profileId,
                name,
                color: color || '#3b82f6', // Default blue
                icon,
                keywords: keywords || []
            }
        });
        res.status(201).json(category);
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Failed to create category' });
    }
};

// Update a category
export const updateCategory = async (req: any, res: Response) => {
    const { id } = req.params;
    const profileId = req.user.profileId;
    const { name, color, icon, keywords } = req.body;

    try {
        const category = await prisma.transactionCategory.findUnique({
            where: { id }
        });

        if (!category || category.profileId !== profileId) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const updatedCategory = await prisma.transactionCategory.update({
            where: { id },
            data: {
                name,
                color,
                icon,
                keywords
            }
        });

        res.json(updatedCategory);
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ error: 'Failed to update category' });
    }
};

// Delete a category
export const deleteCategory = async (req: any, res: Response) => {
    const { id } = req.params;
    const profileId = req.user.profileId;

    try {
        const category = await prisma.transactionCategory.findUnique({
            where: { id }
        });

        if (!category || category.profileId !== profileId) {
            return res.status(404).json({ error: 'Category not found' });
        }

        await prisma.transactionCategory.delete({
            where: { id }
        });

        // Optional: Remove this category from associated transactions?
        // Or keep it as text? The schema stores category as String? on Transaction table for now, 
        // but if we want relation, we should have updated schema.
        // Current schema.prisma says: category String? 
        // So deleting the Category model entry doesn't break FKs, but we might want to nullify the string field or leave it.
        // Leaving it is fine for history.

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
};
