import { TestBed } from '@angular/core/testing';
import { ChipComponent } from './chip.component';

function setup() {
  TestBed.configureTestingModule({
    imports: [ChipComponent],
  });
  const fixture = TestBed.createComponent(ChipComponent);
  return { fixture, component: fixture.componentInstance };
}

describe('ChipComponent', () => {
  it('renders root chip element', () => {
    const { fixture } = setup();
    fixture.detectChanges();

    const chip = fixture.nativeElement.querySelector('.chip');
    expect(chip).toBeTruthy();
  });

  it('applies default variant class', () => {
    const { fixture } = setup();
    fixture.detectChanges();

    const chip = fixture.nativeElement.querySelector('.chip');
    expect(chip.classList.contains('chip--default')).toBe(true);
    expect(chip.className).not.toMatch(/chip--(?:sm|md|lg)\b/);
  });

  it('emits chipDismissed when onDismiss is called', () => {
    const { component } = setup();

    let emitted = false;
    component.chipDismissed.subscribe(() => {
      emitted = true;
    });

    component.onDismiss(new MouseEvent('click'));

    expect(emitted).toBe(true);
  });

  it('creates computed class list including root class name', () => {
    const { component } = setup();
    expect(component.chipClass()).toContain('chip');
  });

  it('renders avatar layout when avatarSrc and text are set', () => {
    const { fixture, component } = setup();
    fixture.componentRef.setInput('avatarSrc', 'https://example.com/a.jpg');
    fixture.componentRef.setInput('text', 'User');
    fixture.detectChanges();

    expect(component.isAvatarText()).toBe(true);
    expect(component.chipClass()).toContain('chip--avatar-text');
    const img = fixture.nativeElement.querySelector('img.chip__avatar') as HTMLImageElement | null;
    expect(img?.getAttribute('src')).toBe('https://example.com/a.jpg');
    expect(fixture.nativeElement.querySelector('.chip__icon')).toBeNull();
  });
});
