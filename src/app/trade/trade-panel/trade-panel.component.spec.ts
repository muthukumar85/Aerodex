import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TradePanelComponent } from './trade-panel.component';

describe('TradePanelComponent', () => {
  let component: TradePanelComponent;
  let fixture: ComponentFixture<TradePanelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TradePanelComponent]
    });
    fixture = TestBed.createComponent(TradePanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
