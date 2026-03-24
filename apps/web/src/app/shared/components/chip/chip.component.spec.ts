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

  it('applies default size and variant classes', () => {
    const { fixture } = setup();
    fixture.detectChanges();

    const chip = fixture.nativeElement.querySelector('.chip');
    expect(chip.classList.contains('chip--sm')).toBe(true);
    expect(chip.classList.contains('chip--default')).toBe(true);
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
});
