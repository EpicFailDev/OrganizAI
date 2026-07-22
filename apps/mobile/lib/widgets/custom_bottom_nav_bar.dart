import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class CustomBottomNavBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onItemTapped;
  final VoidCallback onCenterButtonPressed;

  const CustomBottomNavBar({
    super.key,
    required this.currentIndex,
    required this.onItemTapped,
    required this.onCenterButtonPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.only(bottom: 8),
      child: ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        child: Container(
          height: 80,
          decoration: BoxDecoration(
            color: const Color(0xFF0D1F17),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.3),
                blurRadius: 16,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              // Navigation items row
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _NavItem(
                      icon: Icons.home_rounded,
                      label: 'Início',
                      isActive: currentIndex == 0,
                      onTap: () => onItemTapped(0),
                    ),
                    _NavItem(
                      icon: Icons.receipt_long_rounded,
                      label: 'Transações',
                      isActive: currentIndex == 1,
                      onTap: () => onItemTapped(1),
                    ),
                    // Center spacer for the FAB
                    const SizedBox(width: 64),
                    _NavItem(
                      icon: Icons.receipt_rounded,
                      label: 'Contas',
                      isActive: currentIndex == 2,
                      onTap: () => onItemTapped(2),
                    ),
                    _NavItem(
                      icon: Icons.flag_rounded,
                      label: 'Metas',
                      isActive: currentIndex == 3,
                      onTap: () => onItemTapped(3),
                    ),
                    _NavItem(
                      icon: Icons.grid_view_rounded,
                      label: 'Mais',
                      isActive: currentIndex == 4,
                      onTap: () => onItemTapped(4),
                    ),
                  ],
                ),
              ),
              // Center FAB
              Positioned(
                top: 4,
                left: 0,
                right: 0,
                child: Center(
                  child: GestureDetector(
                    onTap: onCenterButtonPressed,
                    child: Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.4),
                            blurRadius: 16,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.add_rounded,
                        color: AppColors.black,
                        size: 32,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 64,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 24,
              color: isActive ? AppColors.primary : AppColors.textDisabled,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                color: isActive ? AppColors.primary : AppColors.textDisabled,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
